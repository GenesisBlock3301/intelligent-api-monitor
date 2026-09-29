# Video Script — API Sentinel Demo (5–8 minutes)

## 1. Business Problem (30s)

External APIs fail silently. Status codes change, latency spikes, records disappear — and no one knows until users complain. API Sentinel turns raw telemetry into actionable incidents automatically.

## 2. Architecture Overview (60s)

Show the architecture diagram from the README or SYSTEM_ARCHITECTURE.md.

Walk through the flow:

```
POST /monitor → validation → anomaly detection → severity → deduplication
             → LLM alert or fallback → PostgreSQL → GET /alerts → dashboard
```

Key points:
- Modular monolith: one deployment unit, clean internal boundaries
- Detection is deterministic — the LLM only explains, never decides
- PostgreSQL for structured incident state with transactional deduplication

## 3. Healthy Event (30s)

Send a healthy event via curl or the simulator:

```bash
curl -X POST http://localhost:4000/monitor \
  -H 'Content-Type: application/json' \
  -d '{"api_name":"PatientDataAPI","response_time_ms":400,"status_code":200,"records_returned":50}'
```

Response: `healthy: 1, anomalies: 0`. Dashboard stays clean — no false positives.

## 4. Critical Event (60s)

Send a critical failure:

```bash
curl -X POST http://localhost:4000/monitor \
  -H 'Content-Type: application/json' \
  -d '{"api_name":"AppointmentAPI","response_time_ms":5500,"status_code":500,"records_returned":0}'
```

Response: `anomalies: 1`. Switch to the dashboard — a CRITICAL incident appears with:
- Three anomaly types: HTTP_FAILURE, HIGH_LATENCY, ZERO_RECORDS
- Severity: CRITICAL (HTTP failure + zero records)
- Alert message explaining the situation

## 5. Detection Rules (30s)

Explain the three rules:
- **HTTP_FAILURE**: status code >= 500
- **HIGH_LATENCY**: response time > configurable threshold (default 3000ms)
- **ZERO_RECORDS**: records returned === 0

Rules are pure domain functions — no database, no HTTP, no LLM dependency. Fully unit tested.

## 6. Incident Deduplication (45s)

Send the same critical event again. Show:
- Still one incident in the dashboard
- Occurrence count increased from 1 to 2
- `last_seen_at` updated

Explain fingerprinting: `api_name + sorted anomaly types` creates a unique key. A partial unique index in PostgreSQL guarantees at most one active incident per fingerprint.

## 7. AI Explanation (45s)

Click the incident row to open the detail sheet. Show:
- Deterministic facts section (HTTP status, response time, records returned)
- AI explanation section (visually separated)
- Alert source label (LLM or FALLBACK)

Explain the adapter pattern: the `AlertGenerator` interface decouples the system from any specific provider. OpenAI is the current implementation, but swapping providers requires one file.

## 8. LLM Fallback (45s)

The system works without an API key. When the LLM is disabled or fails:
- The incident is still created
- A deterministic fallback message is stored
- `alert_source` is marked FALLBACK

Show that every incident in the current demo uses FALLBACK — the system degrades gracefully.

## 9. Dashboard Walkthrough (60s)

Show:
- Summary cards: active alerts, critical alerts, affected APIs
- Incident table with severity badges, anomaly types, occurrence counts
- Detail sheet with full context
- Edge states: loading skeleton, empty state ("No active incidents"), error with retry
- Automatic polling (updates every 8 seconds)

## 10. Trade-offs (45s)

- **Modular monolith over microservices**: faster delivery, fewer failure modes
- **PostgreSQL over MongoDB**: structured data, transactional deduplication, JSONB flexibility
- **Deterministic detection over ML**: no historical baseline needed, predictable, testable
- **Polling over WebSocket**: simpler, sufficient for prototype, lower risk
- **LLM explains, not decides**: protects the critical detection path from hallucination
