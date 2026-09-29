# Implementation Phases — API Sentinel

## 0. Purpose

> Status: ✅ Done

This document defines the implementation sequence for **API Sentinel — Intelligent API Monitoring & Alert System**.

The goal is to complete a strong, production-minded assignment in **2–3 days** without overengineering.

Core principle:

```text
Build correctness first.
Then resilience.
Then UX.
Then polish.
```

Do not start frontend work before the core monitoring flow works.

---

# Phase 1 — Project Bootstrap

> Status: ✅ Done

## Goal

Create a clean working repository with backend, frontend, environment configuration, and development scripts.

## Tasks

### Repository structure

```text
api-sentinel/
├── backend/
├── frontend/
├── docs/
├── README.md
├── .gitignore
└── docker-compose.yml
```

### Backend initialization

Use:

```text
Node.js
Express
Zod
PostgreSQL client / ORM
Pino
```

Recommended choices:

```text
Express
Zod
Prisma or Drizzle
Pino
Vitest or Jest
Supertest
```

Do not spend too much time comparing ORMs.

Pick one and proceed.

### Frontend initialization

Use:

```text
React
Vite
Tailwind CSS
shadcn/ui
Lucide
```

Optional:

```text
TanStack Query
```

### Environment variables

Create:

```text
backend/.env.example
```

Example:

```env
PORT=4000
DATABASE_URL=
HIGH_LATENCY_THRESHOLD_MS=3000
MAX_MONITOR_BATCH_SIZE=100

LLM_PROVIDER=openai
OPENAI_API_KEY=
LLM_TIMEOUT_MS=4000
```

### Done when

```text
backend starts
frontend starts
database connection works
health endpoint responds
```

Optional health endpoint:

```http
GET /health
```

Expected:

```json
{
  "status": "ok"
}
```

---

# Phase 2 — Define Domain Contracts

> Status: ✅ Done

## Goal

Define the business data structures before implementing behavior.

Do not start with controllers.

## Define API Health Event

```text
ApiHealthEvent

api_name
response_time_ms
status_code
records_returned
```

Example:

```json
{
  "api_name": "AppointmentAPI",
  "response_time_ms": 5500,
  "status_code": 500,
  "records_returned": 0
}
```

## Define Anomaly Types

```text
HTTP_FAILURE
HIGH_LATENCY
ZERO_RECORDS
```

## Define Severity

```text
MEDIUM
HIGH
CRITICAL
```

## Define Incident Status

Minimum:

```text
ACTIVE
```

Optional later:

```text
RESOLVED
```

## Define Alert Source

```text
LLM
FALLBACK
```

## Done when

The data contracts are clear enough that backend and frontend can use the same terminology consistently.

---

# Phase 3 — Input Validation

> Status: ✅ Done

## Goal

Reject invalid telemetry before business logic runs.

## Implement Zod schema

Validate:

```text
api_name
→ required non-empty string

response_time_ms
→ number >= 0

status_code
→ integer 100–599

records_returned
→ integer >= 0
```

## Support

```text
single object
or
array of objects
```

Normalize internally to an array.

## Invalid examples

```json
{
  "api_name": "",
  "response_time_ms": -100,
  "status_code": 999,
  "records_returned": "abc"
}
```

## Error response

Use a clean validation response.

Example:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid monitoring payload",
  "details": [...]
}
```

## Tests

Test:

```text
valid input
missing field
wrong type
negative response time
invalid status code
empty batch
```

## Done when

Invalid data never reaches anomaly detection.

---

# Phase 4 — Deterministic Anomaly Detector

> Status: ✅ Done

## Goal

Implement the core business logic independently from HTTP, database, and LLM.

This is the most important pure domain component.

## Rules

### HTTP Failure

```text
IF status_code >= 500
THEN HTTP_FAILURE
```

### High Latency

```text
IF response_time_ms > HIGH_LATENCY_THRESHOLD_MS
THEN HIGH_LATENCY
```

### Zero Records

```text
IF records_returned == 0
THEN ZERO_RECORDS
```

## Recommended output

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
  }
]
```

## Tests

Must cover:

```text
healthy event
HTTP 500
high latency
zero records
multiple anomalies
```

## Done when

The detector can be tested with no database and no HTTP server.

---

# Phase 5 — Severity Policy

> Status: ✅ Done

## Goal

Convert anomaly combinations into operational priority.

## Suggested rules

```text
HIGH_LATENCY only
→ MEDIUM

HTTP_FAILURE
→ HIGH

HTTP_FAILURE + ZERO_RECORDS
→ CRITICAL

HTTP_FAILURE + HIGH_LATENCY + ZERO_RECORDS
→ CRITICAL
```

## Keep separate from detector

Why:

```text
Detector
→ what happened?

Severity policy
→ how urgent is it?
```

## Tests

Test each severity combination.

## Done when

Every detected anomaly set returns a deterministic severity.

---

# Phase 6 — Database Schema

> Status: ✅ Done

## Goal

Persist incidents in PostgreSQL.

## Recommended table

```text
incidents
```

Fields:

```text
id
fingerprint
api_name
anomaly_types
severity
status_code
response_time_ms
records_returned
alert_message
alert_source
status
occurrence_count
first_seen_at
last_seen_at
resolved_at
created_at
updated_at
```

## Recommended indexes

```text
fingerprint
status
severity
api_name
last_seen_at
```

## Use JSONB for

```text
anomaly_types
```

Optional:

```text
metadata
```

## Migration

Create database migration and verify it works from a clean database.

## Done when

You can insert and retrieve an incident manually through repository code.

---

# Phase 7 — Repository Layer

> Status: ✅ Done

## Goal

Keep database access outside business services.

## Implement

```text
IncidentRepository
```

Suggested methods:

```text
findActiveByFingerprint()
create()
incrementOccurrence()
findActive()
findById()
```

Optional later:

```text
resolve()
```

## Important

Services should not contain raw SQL everywhere.

## Done when

Repository methods are independently testable against the database.

---

# Phase 8 — Incident Fingerprint and Deduplication

> Status: ✅ Done

## Goal

Prevent repeated identical alerts from creating multiple incidents.

## Fingerprint

Use:

```text
api_name + sorted anomaly types
```

Example:

```text
AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE|ZERO_RECORDS
```

## Flow

```text
anomaly detected
      ↓
build fingerprint
      ↓
find ACTIVE incident
   /            \
found          not found
  ↓               ↓
increment       create
occurrence      incident
  ↓               ↓
update          first_seen
last_seen       last_seen
```

## Tests

```text
same anomaly twice
→ one incident
→ occurrence_count = 2
```

Different anomaly types:

```text
same API
different anomaly combination
→ separate incident
```

## Done when

Repeated events no longer flood the database.

---

# Phase 9 — Monitoring Service

> Status: ✅ Done

## Goal

Create the main application orchestration flow.

## Flow

```text
event
 ↓
validate
 ↓
detect anomalies
 ↓
no anomaly?
   ↓
return healthy
 ↓
anomaly exists
 ↓
calculate severity
 ↓
build fingerprint
 ↓
create/update incident
```

At this phase, use a temporary deterministic alert message.

Example:

```text
AppointmentAPI triggered HTTP_FAILURE and ZERO_RECORDS.
```

Do not add LLM yet.

## Suggested service

```text
MonitoringService
```

Pseudo-flow:

```text
process(event)
```

## Done when

A request can go from telemetry input to stored incident without AI.

---

# Phase 10 — POST /monitor

> Status: ✅ Done

## Goal

Expose the monitoring use case through Express.

## Endpoint

```http
POST /monitor
```

## Responsibilities

Controller:

```text
receive request
call validation
call MonitoringService
return response
```

Do not place business rules in controller.

## Batch response example

```json
{
  "received": 3,
  "processed": 3,
  "healthy": 1,
  "anomalies": 2,
  "failed": 0
}
```

## Processing strategy

Use per-event processing.

Possible:

```text
Promise.allSettled()
```

but limit batch size.

## Tests

Integration test:

```text
POST /monitor
→ valid data
→ incident persisted
```

## Done when

Postman/curl can create incidents through the public API.

---

# Phase 11 — GET /alerts

> Status: ✅ Done

## Goal

Expose active incidents for the frontend.

## Endpoint

```http
GET /alerts
```

## Default behavior

Return active incidents ordered by:

```text
last_seen_at DESC
```

Optional filters:

```text
severity
api_name
```

Only implement if time remains.

## Response example

```json
{
  "data": [
    {
      "id": "...",
      "api_name": "AppointmentAPI",
      "severity": "CRITICAL",
      "anomaly_types": [
        "HTTP_FAILURE",
        "HIGH_LATENCY",
        "ZERO_RECORDS"
      ],
      "occurrence_count": 4,
      "last_seen_at": "...",
      "status": "ACTIVE",
      "alert_message": "..."
    }
  ]
}
```

## Done when

Frontend has a stable API contract.

---

# Phase 12 — LLM Adapter

> Status: ✅ Done

## Goal

Add AI explanation without coupling the application to one provider.

## Create internal interface

```text
AlertGenerator
```

Conceptual method:

```text
generate(context)
```

## Provider implementation

Example:

```text
OpenAIAlertAdapter
```

The application service should not depend directly on provider SDK behavior.

## Input

Pass structured facts only.

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

## Prompt constraints

```text
Use only provided evidence.
Do not invent root causes.
Do not claim unsupported certainty.
Generate a concise operational alert.
```

## Done when

A detected incident can receive an AI-generated explanation.

---

# Phase 13 — LLM Failure Fallback

> Status: ✅ Done

## Goal

Ensure AI failure never blocks incident creation.

## Flow

```text
incident detected
      ↓
try LLM
  /       \
success   failure
  ↓          ↓
AI text   fallback text
   \        /
    ↓      ↓
persist incident
```

## Handle

```text
timeout
provider 500
invalid response
missing API key
```

## Suggested behavior

```text
short timeout
optional one retry
fallback
```

Do not retry indefinitely.

## Store

```text
alert_source = LLM
```

or:

```text
alert_source = FALLBACK
```

## Critical test

```text
LLM throws exception
→ incident still stored
→ fallback message exists
```

## Done when

OpenAI/Gemini can be disabled and monitoring still works.

---

# Phase 14 — Structured Logging

> Status: ✅ Done

## Goal

Make system behavior observable.

## Use

```text
Pino
```

## Log events

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

## Include when available

```text
request_id
incident_id
api_name
severity
anomaly_types
```

Do not log:

```text
API keys
secrets
full sensitive payloads
```

## Done when

A developer can follow an event through logs.

---

# Phase 15 — Global Error Handling

> Status: ✅ Done

## Goal

Return consistent API errors.

## Central middleware

```text
error-handler.js
```

## Keep error types minimal

```text
ValidationError
NotFoundError
ExternalServiceError
DatabaseError
```

## Example server error

```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Unable to process request"
}
```

Do not expose production stack traces.

## Done when

Controllers do not manually handle every error type.

---

# Phase 16 — Event Simulator

> Status: ✅ Done

## Goal

Demonstrate the system without building another external application.

Create:

```text
backend/scripts/simulate-events.js
```

## Scenarios

### Healthy

```text
200
400ms
50 records
```

### Slow

```text
200
5000ms
50 records
```

### HTTP Failure

```text
500
800ms
20 records
```

### Zero Records

```text
200
500ms
0 records
```

### Critical Combined Failure

```text
500
5500ms
0 records
```

### Duplicate

Send the same critical event multiple times.

Expected:

```text
one incident
occurrence count increases
```

## Done when

One command can populate the dashboard with meaningful test data.

---

# Phase 17 — Frontend Base Layout

> Status: ✅ Done

## Goal

Build an operational dashboard shell.

Use:

```text
React
Vite
Tailwind
shadcn/ui
Lucide
```

## Layout

```text
Header

Summary metrics

Active incidents table

Incident details sheet
```

Do not build complex navigation.

## Done when

The page structure exists with mock or API data.

---

# Phase 18 — Alerts Data Integration

> Status: ✅ Done

## Goal

Connect dashboard to:

```http
GET /alerts
```

## Implement

```text
loading state
success state
error state
empty state
```

Recommended polling:

```text
5–10 seconds
```

Optional:

```text
TanStack Query
```

## Done when

New backend incidents appear automatically without manual reload.

---

# Phase 19 — Summary Cards

> Status: ✅ Done

## Goal

Provide immediate operational context.

Use only:

```text
Active Alerts
Critical Alerts
Affected APIs
```

Compute from alert data or return summary from backend if already available.

Do not add meaningless cards.

## Done when

The user can understand system status at a glance.

---

# Phase 20 — Incident Table

> Status: ✅ Done

## Goal

Make active incidents easy to scan.

## Columns

```text
API
Severity
Anomaly Types
Occurrences
Last Seen
Status
```

## UX

- semantic severity badge;
- truncate long content;
- rows clickable;
- readable timestamps;
- sensible spacing.

## Done when

The table is useful without opening every incident.

---

# Phase 21 — Incident Details Sheet

> Status: ✅ Done

## Goal

Expose deeper context without navigating away.

Use:

```text
shadcn Sheet
```

## Display

```text
API name
severity
status
triggered rules
raw metrics
AI explanation
alert source
first seen
last seen
occurrence count
```

## Important

Visually separate:

```text
deterministic facts
```

from:

```text
AI-generated explanation
```

## Done when

An engineer can understand why the alert exists.

---

# Phase 22 — UI Edge States

> Status: ✅ Done

## Goal

Avoid happy-path-only UI.

Implement:

### Loading

```text
Skeleton rows
```

### Empty

```text
No active incidents

All monitored API events currently pass the configured health rules.
```

### Error

```text
Unable to load active incidents.

Retry
```

### Long content

Use:

```text
truncate in table
full content in detail sheet
```

## Done when

Every API state produces an intentional UI.

---

# Phase 23 — Core Test Matrix

> Status: ✅ Done

## Goal

Protect the important behavior before polish.

Minimum automated tests:

```text
healthy event
500 error
high latency
zero records
multiple anomalies
severity mapping
duplicate aggregation
GET /alerts
LLM success
LLM failure fallback
invalid input
batch processing
```

Do not chase high test coverage percentages.

Prioritize business-critical behavior.

---

# Phase 24 — README

> Status: ✅ Done

## Goal

Make reviewer onboarding easy.

README should contain:

```text
Project overview
Business problem
Architecture
Tech stack
Setup
Environment variables
Database migration
How to run backend
How to run frontend
How to run simulator
API examples
Design decisions
Trade-offs
Known limitations
Testing
AI usage
```

## Key Architecture Decisions

Document:

```text
Why modular monolith
Why PostgreSQL
Why deterministic detection
Why LLM explanation only
Why fallback
Why polling instead of WebSocket
Why no queue
```

## Done when

A reviewer can run the project without messaging you.

---

# Phase 25 — AI Prompt Documentation

> Status: ✅ Done

## Goal

Satisfy the assignment requirement for AI usage disclosure.

Create:

```text
AI_Prompts.docx
```

Document relevant prompts used for:

```text
architecture planning
business logic
code generation
prompt design
UI generation
debugging
```

Do not hide AI usage.

Explain how generated work was reviewed and validated.

---

# Phase 26 — Final UX Review

> Status: ✅ Done

## Goal

Remove AI-generated UI problems.

Review:

```text
spacing
table density
badge hierarchy
alignment
empty state
error state
loading state
drawer readability
mobile non-breaking behavior
```

Remove:

```text
unnecessary gradients
decorative cards
oversized headings
random colors
redundant text
```

## Done when

The dashboard looks like an operations tool rather than a landing page.

---

# Phase 27 — Final End-to-End Demo

> Status: ✅ Done

## Goal

Verify the exact interview story.

Run:

### Scenario 1

```text
healthy event
→ no incident
```

### Scenario 2

```text
500 + 5500ms + zero records
→ CRITICAL incident
→ AI explanation
→ dashboard
```

### Scenario 3

Repeat same event.

```text
occurrence count increases
→ no duplicate alert
```

### Scenario 4

Disable / mock LLM failure.

```text
incident still created
→ fallback message displayed
```

If these four scenarios work reliably, the core product is strong.

---

# Phase 28 — Video Preparation

> Status: ✅ Done

## Goal

Explain architecture and reasoning, not just show code.

Suggested 5–8 minute flow:

```text
1. Business problem
2. Architecture
3. Healthy event
4. Critical event
5. Detection rules
6. Incident deduplication
7. AI explanation
8. LLM fallback
9. Dashboard
10. Trade-offs
```

Avoid spending the video scrolling through source files.

---

# Phase 29 — Submission Checklist

> Status: ✅ Done

Before sending:

```text
GitHub repository public/access granted
README complete
.env not committed
.env.example included
database setup documented
frontend builds
backend tests pass
simulator works
AI_Prompts.docx uploaded
video link works
CV ready
portfolio ready
reply-all recipients correct
apply@careguidebd.com included
```

---

# Recommended 2–3 Day Schedule

## Day 1 — Core System

Complete phases:

```text
1–11
```

Target:

```text
POST /monitor
→ validation
→ anomaly detection
→ severity
→ deduplication
→ PostgreSQL
→ GET /alerts
```

If this is not working by end of Day 1, do not start visual polish.

---

## Day 2 — AI + Frontend

Complete phases:

```text
12–22
```

Target:

```text
Simulator
→ Monitoring Backend
→ LLM / fallback
→ Database
→ Dashboard
```

By end of Day 2, you should have a complete functional assignment.

---

## Day 3 — Hardening + Submission

Complete phases:

```text
23–29
```

Focus only on:

```text
tests
bugs
UX
documentation
video
submission
```

Do not introduce major architecture on Day 3.

---

# Priority if Time Runs Short

## Tier 1 — Must Work

```text
POST /monitor
validation
anomaly detector
severity
PostgreSQL persistence
GET /alerts
LLM explanation
frontend alert list
error handling
logging
```

## Tier 2 — Strong Differentiators

```text
LLM fallback
deduplication
occurrence count
details drawer
tests
simulator
```

## Tier 3 — Only if Time Remains

```text
resolved lifecycle
filters
email
Docker polish
additional charts
```

---

# Implementation Rule

At every phase ask:

```text
What business problem does this solve?
```

If the answer is unclear, do not add the feature.

Final execution principle:

```text
Correctness
   ↓
Persistence
   ↓
Resilience
   ↓
Visibility
   ↓
Polish
```
