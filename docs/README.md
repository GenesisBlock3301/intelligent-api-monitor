# API Sentinel

API Sentinel is an intelligent API monitoring prototype. It accepts API-health telemetry, detects deterministic anomalies, groups repeated failures into active incidents, adds a human-readable alert, and presents incidents in an operational dashboard.

## Problem and approach

External data APIs can fail, slow down, or return no data without an obvious operational signal. API Sentinel turns telemetry into actionable incidents.

```text
POST /monitor → validation → anomaly detection → severity → deduplication
              → alert generation or fallback → PostgreSQL → GET /alerts → dashboard
```

The system detects HTTP 5xx failures, latency above a configurable threshold, and zero returned records. Detection and severity are deterministic. The LLM only explains already-established facts, so monitoring still works when an API key is absent or the provider fails.

## Architecture and stack

- Backend: Node.js, Express, TypeScript, Zod, Pino, PostgreSQL (`pg`)
- Frontend: React, Vite, Tailwind, Lucide, Radix dialog for the detail sheet
- Database: PostgreSQL 16 through Docker Compose
- AI: OpenAI Responses API through an internal `AlertGenerator` interface

The backend is a modular monolith: HTTP routes call application services; pure domain logic handles detection, severity, and fingerprints; repositories isolate SQL; adapters isolate external AI behavior.

## Setup

Prerequisites: Node.js 20+, npm, Docker Desktop, and Docker Compose.

```bash
docker compose -f docs/docker-compose.yml up -d postgres
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install --prefix backend
npm install --prefix frontend
npm run db:migrate --prefix backend
```

Start the backend:

```bash
npm run dev --prefix backend
```

Start the dashboard in another terminal:

```bash
npm run dev --prefix frontend
```

The backend runs at `http://localhost:4000`; Vite prints the dashboard URL, normally `http://localhost:5173`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | local Docker database |
| `HIGH_LATENCY_THRESHOLD_MS` | Latency anomaly threshold | `3000` |
| `MAX_MONITOR_BATCH_SIZE` | Maximum events in one request | `100` |
| `LLM_PROVIDER` | `openai` or `disabled` | `openai` |
| `LLM_MODEL` | OpenAI text model identifier | `gpt-5-mini` |
| `OPENAI_API_KEY` | Optional server-side OpenAI key | unset |
| `LLM_TIMEOUT_MS` | OpenAI request timeout in milliseconds | `4000` |
| `VITE_API_BASE_URL` | Browser-visible backend base URL | `http://localhost:4000` |

Never put `OPENAI_API_KEY` in the frontend environment file.

## API examples

Submit one event:

```bash
curl -X POST http://localhost:4000/monitor \
  -H 'Content-Type: application/json' \
  -d '{"api_name":"AppointmentAPI","response_time_ms":5500,"status_code":500,"records_returned":0}'
```

Fetch active incidents:

```bash
curl http://localhost:4000/alerts
```

The monitor endpoint accepts either a single object or a non-empty array. It responds with aggregate counts for received, processed, healthy, anomalous, and failed events.

## Demo simulator

With the backend running, generate healthy, slow, HTTP-failure, zero-record, critical, and duplicate scenarios:

```bash
npm run simulate --prefix backend
```

## Testing

```bash
npm test --prefix backend
npm run test:integration --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
```

The integration suite runs the local migration first and verifies persistence, deduplication, `POST /monitor`, and `GET /alerts`. See [TEST_MATRIX.md](TEST_MATRIX.md) for scenario-to-test coverage.

## Design decisions and trade offs

- **Modular monolith:** clear boundaries with one deployment unit; microservices add unnecessary delivery and operational overhead for this assignment.
- **PostgreSQL:** incident data is structured, sortable, filterable, and benefits from transactional deduplication and JSONB anomaly arrays.
- **Deterministic detection:** rules are auditable and testable. The LLM does not decide whether an incident exists or how severe it is.
- **LLM explanation with fallback:** the adapter converts supplied evidence into a concise operational alert. Any LLM failure stores a deterministic fallback alert instead.
- **Polling instead of WebSockets:** an eight-second dashboard refresh is simple and appropriate for this prototype; real-time streaming is unnecessary complexity here.
- **No queue:** bounded batch handling and direct persistence keep the scope focused. A production system could introduce a queue for higher volume or provider isolation.

## Known limitations

- Zero records is always treated as anomalous, though it may be valid for some APIs in production.
- Incidents stay active; automated resolution is not implemented.
- The dashboard currently polls and does not offer filtering, authentication, or notification delivery.
- The LLM model is configurable, but no LLM request is made unless a valid server-side key is supplied.

## AI usage and prompt documentation

AI was used during architecture planning, code generation, prompt design, UI iteration, and debugging. The final implementation was reviewed through TypeScript builds, linting, unit tests, database/API integration tests, and manual simulator checks. See `AI_Prompts.docx` for the disclosure and representative prompts.
