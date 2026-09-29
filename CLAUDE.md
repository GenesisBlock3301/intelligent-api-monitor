# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

API Sentinel — an intelligent API monitoring system that accepts health events via POST, detects anomalies, generates LLM-powered alerts, stores incidents in PostgreSQL, and displays them in a React dashboard. See `AGENTS.md` for the authoritative project workflow and source-of-truth documents.

## Commands

### Backend (from `backend/`)
```bash
npm run dev              # Start dev server with tsx watch (port 4000)
npm run build            # TypeScript compile to dist/
npm test                 # Run unit tests (vitest)
npm run test:integration # Run integration tests (requires running postgres + redis)
npm run db:migrate       # Run database migrations
npm run simulate         # Seed test incidents via simulate-events.ts
```

Run a single test:
```bash
npx vitest run src/services/monitoring.service.test.ts
```

### Frontend (from `frontend/`)
```bash
npm run dev     # Vite dev server (port 3000)
npm run build   # TypeScript check + Vite production build
npm run lint    # oxlint
```

### Docker (from project root)
```bash
docker compose up -d --build   # Start all services (postgres, redis, backend, frontend)
docker compose down            # Stop all services
```

Backend container CMD runs migrations automatically before starting the server.

## Architecture

### Backend (`backend/src/`)

ESM throughout — all imports use `.js` extensions. TypeScript target ES2022, module NodeNext.

```
domain/          Pure business logic, zero dependencies on HTTP/DB/LLM
  contracts.ts     Shared types: ApiHealthEvent, Incident, Severity, AnomalyType
  anomaly-detector.ts  Three rules: HTTP_FAILURE (≥500), HIGH_LATENCY (>threshold), ZERO_RECORDS (==0)
  severity-policy.ts   CRITICAL=HTTP_FAILURE+ZERO_RECORDS, HIGH=HTTP_FAILURE, MEDIUM=else
  incident-fingerprint.ts  Dedup key: api_name + sorted anomaly types

ai/              LLM alert generation
  alert-generator.ts       Interface (AlertGenerator)
  openai-alert-generator.ts  Static OpenAI/DeepSeek client (used in tests)
  dynamic-alert-generator.ts Runtime-configurable: reads settings DB, falls back to env vars

services/        Orchestration layer
  monitoring.service.ts  Core pipeline: detect → fingerprint → dedup → generate alert → persist → email
  email.service.ts       Gmail SMTP via nodemailer, reads config from settings table

repositories/    Database access (pg Pool)
  incident.repository.ts   CRUD + findPaginated with SQL FILTER aggregates for summary stats
  settings.repository.ts   Key-value settings table CRUD

http/            Express routes and middleware
  routes/monitor.routes.ts   POST /monitor — accepts single or array input, invalidates Redis cache
  routes/alerts.routes.ts    GET /alerts (paginated, cached, status filter), PATCH /alerts/:id/resolve
  routes/settings.routes.ts  GET/PUT /settings — masks sensitive values in responses
  middleware/rate-limiter.ts  Redis sorted-set sliding window, fails open
  middleware/error-handler.ts Request-scoped pino logger (request.log)

config/          Zod-validated env vars (env.ts), LLM config (llm.ts), detector thresholds (monitoring.ts)
infrastructure/  Database pool, Redis client, pino logger
validators/      Zod schemas for request validation (monitor.schema.ts)
```

### Request flow

`POST /monitor` → Zod validate → `MonitoringService.process()` → `detectAnomalies()` → `determineSeverity()` → `buildIncidentFingerprint()` → dedup check (find active by fingerprint) → if new: `DynamicAlertGenerator.generate()` (LLM or fallback) → `incidentRepository.create()` → `emailService.sendIncidentAlert()` → invalidate Redis alerts cache

### Frontend (`frontend/src/`)

React 19 + Vite 8 + Tailwind CSS 4. No state management library — `useState`/`useEffect`/`useCallback` with refs for stable polling.

- `App.tsx` — Dashboard shell, polling (8s), status filter tabs (Active/Resolved/All), page size selector
- `IncidentTable.tsx` — Paginated table with severity badges, page number navigation
- `IncidentDetailsSheet.tsx` — Radix Dialog slide-out with resolve button
- `SettingsPanel.tsx` — Radix Dialog for LLM provider and email configuration
- `lib/api.ts` — All fetch calls to backend (alerts, resolve, settings)

### Key patterns

- **Deduplication**: Incidents are fingerprinted by `api_name + sorted anomaly types`. Same fingerprint on an active incident increments `occurrence_count` instead of creating a duplicate.
- **Fallback alerts**: When LLM is unavailable or unconfigured, `MonitoringService` catches the error and generates a deterministic natural-language message using `ANOMALY_DESCRIPTIONS` map.
- **Settings precedence**: `DynamicAlertGenerator` checks DB settings first, falls back to env vars (`llm.ts`). App runs fully without any LLM key or email config.
- **Cache invalidation**: Redis caches paginated alerts (5s TTL, key includes status+page+limit). Cache is invalidated when POST /monitor detects anomalies or when an incident is resolved.
- **Migrations**: Tracked in `schema_migrations` table. Files in `backend/db/migrations/` run automatically on container start.

## Database

PostgreSQL 16. Two tables: `incidents` (UUID PK, fingerprint, anomaly_types as JSONB, status ACTIVE/RESOLVED) and `settings` (key-value for runtime config). Partial unique index on `(fingerprint) WHERE status = 'ACTIVE'` prevents duplicate active incidents.

## Environment Variables

See `backend/.env.example`. Key ones: `DATABASE_URL`, `REDIS_URL`, `LLM_PROVIDER` (openai/deepseek/disabled), `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `LLM_MODEL`, `HIGH_LATENCY_THRESHOLD_MS` (default 3000).

## Testing

Unit tests use vitest with in-memory mocks. Integration tests (`*.integration.test.ts`) require `RUN_DATABASE_TESTS=true` and a running PostgreSQL + Redis. The `test:integration` script handles this.
