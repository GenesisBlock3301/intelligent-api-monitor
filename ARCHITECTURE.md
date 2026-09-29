# API Sentinel — Architecture & Design Decisions

## What This System Does

Accepts API health events, detects anomalies, generates human-readable alerts using an LLM, stores incidents in PostgreSQL, sends email notifications, and displays everything in a real-time dashboard.

---

## Why Each Piece Exists

| Component | Problem It Solves |
|---|---|
| **Domain layer** (`domain/`) | Business rules (anomaly detection, severity, fingerprinting) live in pure functions with zero dependencies — testable without a database, HTTP server, or LLM |
| **PostgreSQL** | ACID guarantees for incident data — partial unique indexes enforce deduplication at the database level, not just application code |
| **Redis** | Two jobs: caching paginated alerts (avoids repeated DB queries during polling) and sliding-window rate limiting (protects against burst traffic) |
| **LLM integration** | Raw telemetry ("status 500, 0 records, 6200ms") is useless to a non-technical stakeholder — the LLM turns it into "AppointmentAPI is currently down and not returning any data" |
| **Fallback alerts** | If the LLM is down, unconfigured, or slow — the system still works. A deterministic message generator takes over so no incident goes unreported |
| **Email service** | Optional push notification — incidents are stored regardless, but email ensures the right people know immediately |
| **React dashboard** | Pull-based visibility — 8-second polling with status filters, severity badges, and a resolve workflow |

---

## Race Conditions Handled

### 1. Duplicate incident creation (concurrent requests, same fingerprint)

**Problem:** Two POST /monitor requests arrive simultaneously for the same failing API. Both check the DB, both see "no active incident," both try to insert.

**Solution — two layers:**
- **Application layer:** An in-memory `inFlight` map per fingerprint. The first request registers its promise; the second waits for it to finish, then increments instead of calling the LLM again. This prevents wasted LLM API calls.
- **Database layer:** A partial unique index `ON (fingerprint) WHERE status = 'ACTIVE'` with `ON CONFLICT` upsert. Even in multi-process deployments where the in-memory lock doesn't help, the DB guarantees exactly one active incident per fingerprint.

### 2. Double-resolve

**Problem:** Two users click "Resolve" on the same incident at the same time.

**Solution:** `UPDATE ... WHERE id = $1 AND status = 'ACTIVE' RETURNING *` — the second request finds no matching row and gets a 404. No data corruption.

### 3. Increment on a just-resolved incident

**Problem:** A new event arrives for a fingerprint whose incident was resolved between the `findActive` check and the `incrementOccurrence` call.

**Solution:** `incrementOccurrence` uses `WHERE status = 'ACTIVE'` — returns null if resolved. The service falls through and creates a new incident instead.

### 4. Rate limiter atomicity

**Problem:** Check-then-increment on a counter is not atomic — concurrent requests could all pass before any count is recorded.

**Solution:** Redis pipeline executes ZREMRANGEBYSCORE + ZADD + ZCARD + EXPIRE as a single round-trip. The sorted-set sliding window is inherently atomic per pipeline.

---

## Fault Tolerance

| Failure | What Happens |
|---|---|
| **LLM down** | Caught, logged. Fallback generates a deterministic alert from anomaly types. Incident is still created and emailed. |
| **Redis down** | Rate limiter fails open (requests pass through, logged). Cache reads/writes are wrapped in try/catch — the system falls back to direct DB queries. |
| **Email SMTP fails** | Caught, logged, returns false. The incident is already persisted — email is fire-and-forget with `.catch()` so a rejection never crashes the process. |
| **DB connection exhaustion** | Pool configured with `max: 20`, `connectionTimeoutMillis: 5000` — requests fail fast with a clear error instead of hanging indefinitely. |
| **Unhandled promise rejection** | Global `process.on('unhandledRejection')` logs the error. `process.on('uncaughtException')` logs and exits cleanly. |
| **Partial batch failure** | `Promise.allSettled` processes every event independently — one bad event doesn't kill the batch. Response reports per-event status. |
| **Graceful shutdown** | SIGINT/SIGTERM close the HTTP server, disconnect Redis, and drain the DB pool — no dropped connections. |

---

## What Makes This Different

1. **Graceful degradation over hard dependencies** — LLM, Redis, and email are all optional. The core pipeline (detect → store → respond) works with just PostgreSQL.

2. **Database-level correctness** — Deduplication isn't just application logic that breaks under concurrency. The partial unique index is the real constraint; application code is an optimization on top.

3. **Two-layer race condition protection** — In-memory coalescing prevents wasted LLM calls in a single process; the DB constraint prevents duplicates across multiple processes.

4. **Clean domain separation** — Anomaly detection, severity policy, and fingerprinting are pure functions. Swapping the LLM provider, database, or notification channel doesn't touch business logic.

---

## Presentation Script (~7 minutes)

### Opening (30s)
> "This is API Sentinel — an intelligent monitoring system that detects API failures and generates human-readable alerts. I'll walk through the architecture, the problems I anticipated, and how I solved them."

### Architecture walkthrough (2 min)
> Show the folder structure. Explain the layered architecture: **domain** (pure logic) → **services** (orchestration) → **repositories** (data access) → **HTTP** (routes/middleware). Highlight that domain has zero imports from infrastructure — it doesn't know about Express, PostgreSQL, or OpenAI.

### Request flow demo (2 min)
> POST a batch of events to /monitor using curl or the seed endpoint. Show the response with per-event results. Open the dashboard — show incidents appearing with severity badges. Click one to show the LLM-generated alert message. Resolve it and show the status change.

### Race conditions & fault tolerance (2 min)
> "The interesting engineering is in what happens when things go wrong."
> - Show the partial unique index in the migration file — explain why application-level checks alone aren't enough.
> - Explain the in-memory fingerprint coalescing — "two concurrent requests for the same failing API, only one LLM call."
> - Show the fallback alert — disable the LLM key, POST an event, show the deterministic message still gets generated.
> - Show Redis resilience — the rate limiter fails open, cache misses fall through to the DB.

### Closing (30s)
> "The design principle throughout is graceful degradation — every external dependency can fail, and the system keeps working. The database is the only hard requirement, and it enforces correctness at the constraint level, not just in application code."
