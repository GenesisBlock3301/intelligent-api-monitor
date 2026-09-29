# API Sentinel — Intelligent API Monitoring & Alert System

An end-to-end system that monitors API health events, detects anomalies in real time, generates AI-powered human-readable alerts, and displays incidents in a dashboard with full lifecycle management.

## Features

- **Anomaly Detection** — Automatically detects HTTP failures (5xx), high latency, and zero-record responses
- **AI-Powered Alerts** — LLM-generated natural-language incident descriptions (OpenAI / DeepSeek), with deterministic fallback when no LLM is configured
- **Incident Lifecycle** — Create, deduplicate (fingerprint-based), and resolve incidents
- **Dashboard** — Real-time incident table with severity badges, status codes, pagination, status filtering (Active / Resolved / All), and detail slide-out panel
- **Settings Page** — Configure LLM provider and email notifications from the UI — no restart required
- **Email Notifications** — Optional Gmail SMTP alerts sent to admins when new incidents are created
- **Test Event Simulator** — Built-in form with preset scenarios to demo the full pipeline from the UI
- **Rate Limiting** — Redis sliding-window rate limiter with fail-open behavior
- **Dockerized** — One command to run the entire stack (PostgreSQL, Redis, backend, frontend)

## Architecture

```
┌────────────┐     POST /monitor      ┌──────────────────────────────┐
│  External   │ ───────────────────►   │         Backend (Express)    │
│  API Data   │                        │                              │
└────────────┘                        │  Zod Validate                │
                                       │       ↓                      │
┌────────────┐     GET /alerts         │  Anomaly Detector            │
│  Frontend   │ ◄──────────────────    │       ↓                      │
│  (React)    │                        │  Severity Policy             │
│             │     Settings/Resolve   │       ↓                      │
│  Dashboard  │ ◄──────────────────►   │  Dedup (Fingerprint)         │
│  Settings   │                        │       ↓                      │
│  Test Form  │                        │  LLM Alert Generator         │
└────────────┘                        │  (Dynamic: DB → Env fallback)│
                                       │       ↓                      │
                                       │  PostgreSQL  ←→  Redis Cache │
                                       │       ↓                      │
                                       │  Email Service (optional)    │
                                       └──────────────────────────────┘
```

### Backend Modules (`backend/src/`)

| Module | Responsibility |
|---|---|
| `domain/` | Pure business logic — anomaly detection, severity policy, fingerprinting, contracts |
| `ai/` | LLM alert generation (static + dynamic runtime-configurable) |
| `services/` | Orchestration — monitoring pipeline, email notifications |
| `repositories/` | Database access — incidents, settings |
| `http/` | Express routes (`/monitor`, `/alerts`, `/settings`), middleware (rate limiter, error handler) |
| `config/` | Zod-validated environment variables |
| `infrastructure/` | Database pool, Redis client, pino logger |
| `validators/` | Request payload schemas |

### Frontend (`frontend/src/`)

React 19 + Vite + Tailwind CSS 4 + Radix UI. Polling-based dashboard (8s interval) with server-side pagination and Redis-cached responses.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) An LLM API key (OpenAI or DeepSeek) — the app works without one

### Run with Docker (recommended)

```bash
# Start everything
make up-build

# Or without Make:
docker compose up -d --build
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

### Run Locally (development)

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env to add your LLM API key (optional)
npm install
npm run db:migrate
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Seed Test Data

```bash
# Via Make
make simulate

# Or directly
cd backend && npm run simulate
```

Or use the **Test Event** button in the dashboard UI to send individual events through the pipeline.

## Make Commands

```
make up-build        Build and start all containers
make fresh           Kill ports, rebuild, and start (clean restart)
make down            Stop containers
make down-v          Stop and remove volumes (wipes database)
make logs            Tail all container logs
make logs-backend    Tail backend logs
make shell-backend   Shell into backend container
make shell-db        Open PostgreSQL shell
make migrate         Run database migrations
make test            Run backend unit tests
make test-integration  Run integration tests
make simulate        Seed test incidents
make lint            Lint frontend
make clean           Prune all Docker resources
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/monitor` | Ingest API health events (single or batch) |
| `GET` | `/alerts` | Paginated incidents with summary stats (`?page=1&limit=20&status=ACTIVE`) |
| `PATCH` | `/alerts/:id/resolve` | Resolve an incident |
| `GET` | `/settings` | Get app configuration (sensitive values masked) |
| `PUT` | `/settings` | Update LLM and email configuration |
| `GET` | `/health` | Health check |

### Example: Submit a health event

```bash
curl -X POST http://localhost:4000/monitor \
  -H "Content-Type: application/json" \
  -d '[{
    "api_name": "AppointmentAPI",
    "status_code": 500,
    "response_time_ms": 5500,
    "records_returned": 0
  }]'
```

## Configuration

The app runs with **zero configuration** — all LLM and email settings are optional and can be configured from the Settings page in the UI.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...localhost:5432/api_sentinel` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `LLM_PROVIDER` | `deepseek` | LLM provider (`openai`, `deepseek`, `disabled`) |
| `LLM_MODEL` | `deepseek-chat` | Model name |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `DEEPSEEK_API_KEY` | — | DeepSeek API key |
| `HIGH_LATENCY_THRESHOLD_MS` | `3000` | Latency threshold for anomaly detection |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

### Runtime Settings (via UI)

LLM provider, API key, model name, email notifications — all configurable from the dashboard Settings panel. Settings stored in the database take precedence over environment variables.

## Anomaly Detection Rules

| Rule | Trigger | Severity contribution |
|---|---|---|
| `HTTP_FAILURE` | `status_code >= 500` | Contributes to HIGH or CRITICAL |
| `HIGH_LATENCY` | `response_time_ms > 3000` | Contributes to MEDIUM+ |
| `ZERO_RECORDS` | `records_returned == 0` | Contributes to MEDIUM+ |

### Severity Policy

- **CRITICAL** — HTTP_FAILURE + ZERO_RECORDS (both present)
- **HIGH** — HTTP_FAILURE alone
- **MEDIUM** — Any other anomaly combination

## Testing

```bash
# Unit tests
cd backend && npm test

# Integration tests (requires running PostgreSQL + Redis)
make test-integration

# Lint frontend
make lint
```

## Tech Stack

**Backend**: Node.js, Express 5, TypeScript, PostgreSQL 16, Redis 7, pino, Zod, OpenAI SDK, Nodemailer

**Frontend**: React 19, Vite 8, Tailwind CSS 4, Radix UI, Lucide Icons

**Infrastructure**: Docker Compose, nginx
