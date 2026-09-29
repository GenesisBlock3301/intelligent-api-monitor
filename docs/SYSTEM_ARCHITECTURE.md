# Final System Architecture — Intelligent API Monitoring & Alert System

## 1. Architecture Decision

Use:

```text
React SPA
+
Node.js / Express Modular Monolith
+
Lightweight Layered Architecture
+
PostgreSQL
+
LLM Adapter
```

This architecture is intentionally optimized for:

- a 2–3 day implementation;
- clear separation of concerns;
- straightforward testing;
- low deployment complexity;
- good interview explainability;
- future extensibility without premature microservices.

---

## 2. Why a Modular Monolith

The backend is deployed as **one Node.js application**, but internal responsibilities are separated into modules and layers.

Do not create separate services for:

- monitoring;
- incidents;
- AI;
- alerts;
- notifications.

For this assignment, microservices would create unnecessary:

- deployment complexity;
- networking;
- failure modes;
- configuration;
- debugging overhead.

A modular monolith keeps one deployment unit while preserving clean internal boundaries.

---

## 3. Why Layered Architecture

SPA describes the frontend style.

Layered architecture describes backend code organization.

They are complementary.

### Frontend

```text
React SPA
```

### Backend

```text
HTTP Layer
    ↓
Application Layer
    ↓
Domain Layer
    ↓
Infrastructure Layer
```

### Layer Responsibilities

#### HTTP / Presentation Layer

Contains:

- routes;
- controllers;
- request/response mapping.

Does not contain business rules.

#### Application Layer

Coordinates use cases.

Contains:

- MonitoringService;
- IncidentService;
- AlertQueryService.

#### Domain Layer

Contains core business logic.

Contains:

- AnomalyDetector;
- SeverityPolicy;
- FingerprintBuilder;
- incident rules.

Should not depend on:

- Express;
- PostgreSQL;
- OpenAI;
- React.

#### Infrastructure Layer

Contains external implementation details.

Contains:

- PostgreSQL repository;
- LLM provider adapter;
- logger;
- environment configuration.

---

## 4. Final High-Level Architecture

```text
                  Input Sources
        ┌────────────┬──────────────┐
        │            │              │
   Static JSON    Postman       Simulator
        │            │              │
        └────────────┴──────────────┘
                     │
                     ▼
              POST /monitor
                     │
                     ▼
            ┌────────────────┐
            │ Express Route  │
            └───────┬────────┘
                    │
                    ▼
            ┌────────────────┐
            │ Validation     │
            │ Zod            │
            └───────┬────────┘
                    │
                    ▼
            ┌────────────────┐
            │ Monitoring     │
            │ Service        │
            └───────┬────────┘
                    │
                    ▼
            ┌────────────────┐
            │ Anomaly        │
            │ Detector       │
            └───────┬────────┘
                    │
             anomaly found?
               /         \
             No           Yes
             │             │
             ▼             ▼
           log       Severity Policy
                            │
                            ▼
                     Incident Service
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        Fingerprint      Repository    Alert Generator
        / Dedup             │              │
             │              │          LLM Adapter
             │              │              │
             │              │        failure → fallback
             │              │              │
             └──────────────┴──────────────┘
                            │
                            ▼
                       PostgreSQL
                            │
                            ▼
                       GET /alerts
                            │
                            ▼
                     React Dashboard
```

---

## 5. Core Processing Sequence

Example input:

```json
{
  "api_name": "AppointmentAPI",
  "response_time_ms": 5500,
  "status_code": 500,
  "records_returned": 0
}
```

Sequence:

```text
1. POST /monitor

2. Request validated

3. MonitoringService receives normalized event

4. AnomalyDetector returns:
   - HTTP_FAILURE
   - HIGH_LATENCY
   - ZERO_RECORDS

5. SeverityPolicy returns:
   - CRITICAL

6. Fingerprint generated:
   AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE|ZERO_RECORDS

7. IncidentService checks repository

8A. Existing ACTIVE incident found:
    - occurrence_count += 1
    - last_seen_at updated

8B. No existing ACTIVE incident:
    - create incident

9. AlertGenerator attempts LLM generation

10A. LLM succeeds:
     - store human-readable alert
     - alert_source = LLM

10B. LLM fails:
     - deterministic fallback message
     - alert_source = FALLBACK

11. Persist incident

12. GET /alerts exposes active incidents

13. React dashboard displays operational view
```

---

## 6. Backend Modules

Recommended lightweight modules:

```text
monitoring
incidents
alerts
ai
shared
```

Do not create excessive domain abstractions.

---

## 7. Recommended Backend Folder Structure

```text
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── routes/
│   │   ├── monitor.routes.js
│   │   └── alerts.routes.js
│   │
│   ├── controllers/
│   │   ├── monitor.controller.js
│   │   └── alerts.controller.js
│   │
│   ├── services/
│   │   ├── monitoring.service.js
│   │   ├── incident.service.js
│   │   ├── anomaly-detector.service.js
│   │   ├── severity-policy.service.js
│   │   └── alert-generator.service.js
│   │
│   ├── adapters/
│   │   └── llm-alert.adapter.js
│   │
│   ├── repositories/
│   │   └── incident.repository.js
│   │
│   ├── validators/
│   │   └── monitor.schema.js
│   │
│   ├── middleware/
│   │   ├── error-handler.js
│   │   └── request-id.js
│   │
│   ├── config/
│   │   ├── env.js
│   │   └── monitoring.config.js
│   │
│   ├── utils/
│   │   └── logger.js
│   │
│   └── db/
│       └── ...
│
├── tests/
│   ├── unit/
│   └── integration/
│
└── scripts/
    └── simulate-events.js
```

For a 2–3 day build, this is the upper bound of useful structure. Do not add abstractions unless they remove real duplication or improve testability.

---

## 8. API Design

### POST `/monitor`

Purpose:

- receive one or multiple API telemetry events;
- validate;
- detect anomalies;
- create/update incidents.

Example response:

```json
{
  "received": 3,
  "processed": 3,
  "healthy": 1,
  "anomalies": 2,
  "failed": 0
}
```

### GET `/alerts`

Purpose:

- return active incidents.

Optional query filters if time remains:

```text
severity
api_name
```

Example:

```http
GET /alerts?severity=CRITICAL
```

### Optional

```http
GET /alerts/:id
```

Only add if needed for the details page and time permits.

---

## 9. Validation Architecture

Use:

```text
Zod
```

Event schema:

```text
api_name
  required string
  non-empty

response_time_ms
  required number
  >= 0

status_code
  required integer
  100–599

records_returned
  required integer
  >= 0
```

Validation must run before anomaly detection.

---

## 10. Anomaly Detector

The anomaly detector is pure domain logic.

It must not access:

- HTTP request/response;
- database;
- LLM;
- filesystem.

Input:

```text
ApiHealthEvent
```

Output example:

```json
[
  {
    "type": "HTTP_FAILURE",
    "evidence": {
      "status_code": 500
    }
  },
  {
    "type": "HIGH_LATENCY",
    "evidence": {
      "actual_ms": 5500,
      "threshold_ms": 3000
    }
  },
  {
    "type": "ZERO_RECORDS",
    "evidence": {
      "records_returned": 0
    }
  }
]
```

---

## 11. Configuration

Use environment/configuration rather than scattered magic numbers.

Example:

```env
HIGH_LATENCY_THRESHOLD_MS=3000
LLM_TIMEOUT_MS=4000
MAX_MONITOR_BATCH_SIZE=100
```

Recommended config:

```text
config/
  env.js
  monitoring.config.js
```

---

## 12. Severity Policy

Keep severity separate from detection.

Detection answers:

```text
What happened?
```

Severity answers:

```text
How urgent is it?
```

Recommended:

```text
HIGH_LATENCY
→ MEDIUM

HTTP_FAILURE
→ HIGH

HTTP_FAILURE + ZERO_RECORDS
→ CRITICAL

HTTP_FAILURE + HIGH_LATENCY + ZERO_RECORDS
→ CRITICAL
```

---

## 13. Incident Correlation

Fingerprint:

```text
api_name + sorted anomaly types
```

Example:

```text
AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE|ZERO_RECORDS
```

Repository query:

```text
findActiveByFingerprint()
```

If found:

```text
increment occurrence count
update last seen timestamp
```

If not found:

```text
create incident
```

This prevents alert flooding.

---

## 14. LLM Adapter

Define an internal interface:

```text
AlertGenerator
```

Conceptual method:

```text
generate(context)
```

Provider-specific implementation:

```text
OpenAIAlertAdapter
```

or:

```text
GeminiAlertAdapter
```

The rest of the application should not depend directly on provider SDK details.

---

## 15. LLM Prompt Contract

Provide structured evidence.

Example:

```json
{
  "api_name": "AppointmentAPI",
  "status_code": 500,
  "response_time_ms": 5500,
  "records_returned": 0,
  "anomalies": [
    "HTTP_FAILURE",
    "HIGH_LATENCY",
    "ZERO_RECORDS"
  ],
  "severity": "CRITICAL"
}
```

Prompt behavior:

```text
Generate a concise operational alert.

Use only the supplied evidence.
Do not invent root causes.
Do not claim certainty beyond the evidence.
Keep the response concise and actionable.
```

---

## 16. LLM Resilience

Recommended:

```text
short timeout
+
one attempt or at most one retry
+
fallback
```

Do not make LLM availability part of monitoring correctness.

Fallback example:

```text
AppointmentAPI triggered HTTP_FAILURE, HIGH_LATENCY and ZERO_RECORDS.
Status code: 500. Response time: 5500 ms. Records returned: 0.
```

---

## 17. PostgreSQL Design

Recommended database:

```text
PostgreSQL
```

Reason:

- structured incident schema;
- filtering;
- sorting;
- unique constraints;
- transactional updates;
- deduplication support;
- JSONB available for flexible anomaly metadata.

MongoDB is valid, but flexible document storage does not provide a major advantage for this normalized telemetry model.

---

## 18. Incident Table

Recommended fields:

```text
id UUID PRIMARY KEY
fingerprint VARCHAR
api_name VARCHAR
anomaly_types JSONB
severity VARCHAR
status_code INTEGER
response_time_ms INTEGER
records_returned INTEGER
alert_message TEXT
alert_source VARCHAR
status VARCHAR
occurrence_count INTEGER
first_seen_at TIMESTAMP
last_seen_at TIMESTAMP
resolved_at TIMESTAMP NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Recommended indexes:

```text
status
severity
api_name
last_seen_at
fingerprint
```

---

## 19. Batch Processing

The assignment requires batch support.

For the prototype:

```text
POST /monitor
    ↓
normalize to array
    ↓
validate events
    ↓
process events
    ↓
aggregate result
```

Use per-event processing so one failed event does not necessarily destroy a whole valid batch.

For Node.js:

```text
Promise.allSettled()
```

is reasonable if database/LLM concurrency is controlled and batch size is limited.

Do not prematurely implement a queue.

---

## 20. Logging

Use structured logging.

Recommended:

```text
Pino
```

Events:

```text
monitor_request_received
validation_failed
healthy_event_processed
anomaly_detected
incident_created
incident_updated
llm_request_started
llm_request_failed
fallback_used
request_failed
```

Include:

```text
request_id
api_name
severity
incident_id
```

when available.

---

## 21. Error Handling

Use centralized Express error middleware.

Flow:

```text
Controller
   ↓
Service
   ↓
Repository / Adapter
   ↓
Error
   ↓
Global Error Handler
   ↓
HTTP response
```

Keep error types minimal.

Suggested:

```text
ValidationError
NotFoundError
ExternalServiceError
DatabaseError
```

Do not create a large exception hierarchy.

---

## 22. Frontend Architecture

Use:

```text
React SPA
+
Vite
+
Tailwind CSS
+
shadcn/ui
+
Lucide
```

Optional:

```text
TanStack Query
```

Recommended structure:

```text
frontend/
├── src/
│   ├── pages/
│   │   └── Dashboard.jsx
│   ├── components/
│   │   ├── SummaryCards.jsx
│   │   ├── AlertTable.jsx
│   │   └── IncidentDetails.jsx
│   ├── api/
│   │   └── alerts.js
│   └── hooks/
│       └── useAlerts.js
```

No Redux required.

---

## 23. Frontend Data Refresh

For the prototype:

```text
poll GET /alerts every 5–10 seconds
```

Do not add WebSockets unless everything else is complete.

Future evolution:

```text
Server-Sent Events
or
WebSocket
```

---

## 24. Failure Boundaries

### Database failure

```text
incident persistence fails
→ log error
→ request fails
```

### LLM failure

```text
incident remains valid
→ fallback alert used
```

### Frontend failure

```text
monitoring backend continues
```

### Invalid input

```text
reject before anomaly processing
```

### Repeated anomaly

```text
update active incident
```

---

## 25. Critical Path

The system's correctness path is:

```text
Input
↓
Validation
↓
Detection
↓
Incident correlation
↓
Persistence
```

The LLM is an augmentation layer:

```text
Incident
↓
AI explanation
```

It is intentionally not the source of truth.

---

## 26. Deployment Strategy

For the assignment, keep deployment simple.

### Option A — Docker Compose

```text
frontend
backend
postgres
```

### Option B — Hosted

```text
Frontend
→ Vercel

Backend
→ Railway / Render

Database
→ Managed PostgreSQL
```

Do not add Nginx, Kubernetes or orchestration unless already complete and useful.

---

## 27. Testing Strategy

### Unit Tests

Test:

- AnomalyDetector
- SeverityPolicy
- FingerprintBuilder
- FallbackAlertGenerator

### Integration Tests

Test:

- `POST /monitor`
- database persistence
- duplicate incident behavior
- `GET /alerts`

### LLM

Mock provider responses during automated tests.

Important test:

```text
LLM fails
→ incident still persists
→ fallback text exists
```

---

## 28. Key Architecture Trade-offs

### Modular Monolith vs Microservices

Chosen:

```text
Modular Monolith
```

Reason:

- faster delivery;
- fewer failure modes;
- easier debugging;
- clean enough for future decomposition.

### PostgreSQL vs MongoDB

Chosen:

```text
PostgreSQL
```

Reason:

- structured operational data;
- indexing/filtering;
- constraints;
- transaction-friendly deduplication;
- JSONB covers flexible anomaly metadata.

### Polling vs WebSocket

Chosen:

```text
Polling
```

Reason:

- simpler;
- sufficient for assignment;
- lower delivery risk.

### Rules vs ML Detection

Chosen:

```text
Deterministic rules
```

Reason:

- assignment provides no historical baseline;
- predictable;
- testable;
- explainable.

### AI Detector vs AI Explanation

Chosen:

```text
AI explanation only
```

Reason:

- protects critical detection path;
- reduces hallucination impact;
- easier tests;
- lower cost;
- graceful AI failure.

---

## 29. Final Architecture Statement

> The system is a modular Node.js monitoring application that ingests API health telemetry, validates it, applies deterministic anomaly rules, correlates repeated failures into operational incidents, assigns severity, generates resilient AI-assisted explanations, persists incident state in PostgreSQL, and exposes active incidents to a React operational dashboard.

Core principle:

```text
Business truth
    ↓
Deterministic domain logic

Human interpretation
    ↓
LLM augmentation

Operational state
    ↓
PostgreSQL

Human visibility
    ↓
React dashboard
```
