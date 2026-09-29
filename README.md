# API Sentinel

An intelligent API monitoring and alert system. It receives API-health telemetry, detects deterministic anomalies, stores active incidents, and presents them in an operational dashboard.

## Project structure

- `backend/` — Express modular monolith and PostgreSQL integration.
- `frontend/` — React/Vite dashboard.
- `docs/` — Supporting implementation notes.

## Local development

1. Start PostgreSQL: `docker compose up -d postgres`
2. Copy `backend/.env.example` to `backend/.env`.
3. Install dependencies in `backend/` and `frontend/` with `npm install`.
4. Start the backend with `npm run dev` from `backend/`.
5. Start the frontend with `npm run dev` from `frontend/`.

The backend health check is available at `GET /health` on port `4000`.
