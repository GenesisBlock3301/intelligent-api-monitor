# Business Analysis — Intelligent API Monitoring & Alert System

## 1. Executive Summary

This project is an **Intelligent API Monitoring & Alert System** designed to receive API health telemetry, detect abnormal behavior, convert technical anomalies into human-readable operational alerts, persist incidents, and display active issues through an operational dashboard.

The assignment requires the system to monitor API responses, detect anomalies such as high latency, failed requests, and missing/zero records, generate AI-powered alerts, store anomalies, expose active anomalies through `/alerts`, support batch processing, provide logging and error handling, and include a frontend.

This implementation is intentionally scoped as a **2–3 day production-minded prototype**. The goal is not maximum feature count; the goal is a clear, testable, resilient system that demonstrates sound business analysis and engineering decisions.

---

## 2. Business Problem

The company depends on multiple external APIs for patient and operational data.

These integrations may:

- fail intermittently;
- return HTTP errors;
- become abnormally slow;
- return zero or missing records;
- produce inconsistent operational behavior.

Without automated monitoring, failures may only be discovered after a user reports a problem or an engineer manually inspects logs.

### Current-risk flow

```text
External API problem
        ↓
Application behavior degrades
        ↓
User / operator notices
        ↓
Engineer checks logs
        ↓
Engineer interprets raw technical data
        ↓
Issue identified
```

### Target flow

```text
API health event
        ↓
Validation
        ↓
Deterministic anomaly detection
        ↓
Incident classification
        ↓
Human-readable AI explanation
        ↓
Persistent active incident
        ↓
Operational dashboard
        ↓
Operator investigates
```

---

## 3. Product Goal

Transform raw API telemetry into **actionable operational incidents**.

The system should answer these questions quickly:

1. Which API is having a problem?
2. What type of problem occurred?
3. How severe is it?
4. When was it first and most recently observed?
5. How many times has it occurred?
6. What evidence caused the system to classify it as an anomaly?
7. How can the technical issue be explained in human-readable language?

---

## 4. Primary Users

### 4.1 Operations / Support Engineer

Needs to know:

- what is broken;
- what is most urgent;
- whether the issue is still active;
- how often it is happening;
- the technical reason behind the alert.

### 4.2 Backend / Platform Engineer

Needs:

- raw metrics;
- triggered rules;
- timestamps;
- incident history / occurrence count;
- technical context for investigation.

### 4.3 Engineering Manager / Technical Lead

Needs:

- active incident count;
- critical incident count;
- affected API count;
- understandable operational visibility.

For this assignment, a single operational dashboard can serve all three personas.

---

## 5. Scope

### In Scope

- `POST /monitor`
- single-event or batch monitoring input
- input validation
- HTTP failure detection
- latency anomaly detection
- zero-record anomaly detection
- configurable thresholds
- severity classification
- incident persistence
- active incident retrieval
- `GET /alerts`
- human-readable LLM alert generation
- deterministic fallback if LLM fails
- duplicate incident aggregation
- occurrence count
- first seen / last seen timestamps
- logging
- frontend dashboard
- loading, error, empty and populated UI states
- simulator / seed script for demonstration
- unit and integration tests for critical behavior

### Out of Scope for the 2–3 Day Build

- microservices
- Kafka / RabbitMQ
- Kubernetes
- Prometheus / Grafana
- machine-learning anomaly models
- dynamic statistical baselines
- real hospital system integration
- RBAC / enterprise authentication
- PagerDuty / Slack integration
- multi-tenancy
- advanced historical analytics
- full incident workflow
- sophisticated notification routing

Optional email notification is not part of the core 2–3 day plan.

---

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Accept API monitoring input | Must |
| FR-02 | Support batch API telemetry input | Must |
| FR-03 | Validate all input before processing | Must |
| FR-04 | Detect HTTP failures | Must |
| FR-05 | Detect high response time | Must |
| FR-06 | Detect zero/missing records | Must |
| FR-07 | Store detected anomalies | Must |
| FR-08 | Generate human-readable LLM alerts | Must |
| FR-09 | Expose active incidents through `/alerts` | Must |
| FR-10 | Display incidents in a usable frontend | Must |
| FR-11 | Provide structured logging | Must |
| FR-12 | Handle backend errors cleanly | Must |
| FR-13 | Assign severity | Should |
| FR-14 | Aggregate duplicate incidents | Should |
| FR-15 | Track occurrence count | Should |
| FR-16 | Continue working if LLM is unavailable | Should |
| FR-17 | Track resolved incidents | Could |
| FR-18 | Send email alerts | Could |

---

## 7. Input Contract

Primary interface:

```http
POST /monitor
Content-Type: application/json
```

Example batch:

```json
[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]
```

The project does not require another full application to generate these inputs.

For demonstration, use:

- Postman / curl;
- sample JSON;
- `scripts/simulate-events.js`.

---

## 8. Core Business Rules

### BR-01 — HTTP Failure

```text
IF status_code >= 500
THEN anomaly = HTTP_FAILURE
```

### BR-02 — High Latency

```text
IF response_time_ms > configured threshold
THEN anomaly = HIGH_LATENCY
```

Recommended prototype default:

```env
HIGH_LATENCY_THRESHOLD_MS=3000
```

The threshold is a configurable implementation assumption, not a universal business truth.

### BR-03 — Zero Records

```text
IF records_returned == 0
THEN anomaly = ZERO_RECORDS
```

Important limitation:

Zero records can be valid for some real APIs. It is treated as anomalous here because the assignment explicitly identifies it as an anomaly condition.

---

## 9. Severity Model

Recommended prototype levels:

```text
MEDIUM
HIGH
CRITICAL
```

Example policy:

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

Severity exists to reduce operator decision time.

---

## 10. AI Role

The LLM is **not the primary anomaly detector**.

### Deterministic responsibilities

- determine whether an anomaly exists;
- identify anomaly type;
- assign severity;
- correlate duplicate incidents.

### LLM responsibility

Convert already-detected technical facts into a concise human-readable explanation.

Example input:

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

Example output:

```text
AppointmentAPI returned HTTP 500, took 5.5 seconds to respond,
and returned no records. This indicates an operational API or
upstream data availability issue requiring investigation.
```

The prompt should instruct the model:

- use only supplied evidence;
- do not invent root causes;
- keep the alert concise;
- avoid unsupported claims.

---

## 11. LLM Failure Behavior

The monitoring system must still function if the LLM provider fails.

```text
Incident detected
       ↓
Try LLM
    /      \
success    failure
   ↓          ↓
AI text    fallback text
    \        /
     ↓      ↓
Persist incident
```

Example fallback:

```text
AppointmentAPI triggered HTTP_FAILURE, HIGH_LATENCY and ZERO_RECORDS.
Status code: 500. Response time: 5500 ms. Records returned: 0.
```

---

## 12. Duplicate Incident Policy

Repeated failures should not create unlimited duplicate alerts.

Incident fingerprint:

```text
api_name + normalized anomaly types
```

Example:

```text
AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE|ZERO_RECORDS
```

If an active incident with the same fingerprint exists:

```text
occurrence_count += 1
last_seen_at = current timestamp
```

Otherwise:

```text
create new incident
occurrence_count = 1
first_seen_at = now
last_seen_at = now
```

---

## 13. Incident Lifecycle

Minimum:

```text
ACTIVE
```

Optional if time remains:

```text
ACTIVE
RESOLVED
```

Possible future transition:

```text
Anomaly detected
    ↓
ACTIVE
    ↓
same anomaly repeated
    ↓
occurrence count increases
    ↓
healthy recovery observed
    ↓
RESOLVED
```

For a 2–3 day build, ACTIVE incident support is mandatory; auto-resolution is secondary.

---

## 14. Data Model

Recommended `incidents` fields:

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

`alert_source` values:

```text
LLM
FALLBACK
```

---

## 15. Dashboard UX Requirements

The dashboard must answer operator questions immediately.

### Summary

- Active Alerts
- Critical Alerts
- Affected APIs

### Active Incidents Table

Columns:

- API
- Severity
- Anomaly Types
- Occurrences
- Last Seen
- Status

### Incident Details

Show:

- API name
- severity
- status
- triggered rules
- raw metrics
- AI explanation
- alert source
- first seen
- last seen
- occurrence count

---

## 16. UI States

The UI must cover more than the happy path.

Required states:

- loading;
- empty;
- backend error;
- populated;
- long alert message;
- repeated incident count.

### Empty State Example

```text
No active incidents

All monitored API events currently pass the configured health rules.
```

---

## 17. Acceptance Criteria

### AC-01 Healthy Event

Given:

```text
status_code = 200
response_time_ms below threshold
records_returned > 0
```

Then:

```text
no incident is created
```

### AC-02 HTTP Failure

```text
500 response
→ HTTP_FAILURE
```

### AC-03 High Latency

```text
response time above configured threshold
→ HIGH_LATENCY
```

### AC-04 Empty Result

```text
records_returned = 0
→ ZERO_RECORDS
```

### AC-05 Combined Failure

```text
500 + high latency + 0 records
→ one incident
→ multiple anomaly types
→ CRITICAL severity
```

### AC-06 LLM Success

```text
incident detected
→ human-readable alert generated
→ alert persisted
```

### AC-07 LLM Failure

```text
LLM unavailable
→ incident still persists
→ deterministic fallback message used
```

### AC-08 Duplicate Event

```text
same active anomaly repeated
→ no duplicate incident
→ occurrence count increases
→ last_seen_at updates
```

### AC-09 Alerts API

```text
GET /alerts
→ active incidents returned
```

### AC-10 Dashboard

User can identify:

- affected API;
- severity;
- anomaly reason;
- occurrence count;
- last occurrence;
- human-readable explanation.

---

## 18. Non-Functional Requirements

### Reliability

LLM availability must not determine monitoring correctness.

### Maintainability

Separate:

- HTTP transport;
- validation;
- business rules;
- persistence;
- LLM integration.

### Observability

Use structured logs for:

```text
monitor_request_received
validation_failed
healthy_event_processed
anomaly_detected
incident_created
incident_updated
llm_request_failed
fallback_used
```

### Security

- API keys only on backend;
- `.env` excluded from Git;
- `.env.example` provided;
- validate external input;
- do not log secrets;
- configure CORS;
- production errors must not expose stack traces.

---

## 19. 2–3 Day Delivery Plan

### Day 1 — Core Backend

Deliver:

- project setup;
- Express API;
- Zod validation;
- anomaly detector;
- severity policy;
- PostgreSQL schema;
- repository;
- incident creation;
- deduplication;
- `/alerts`;
- core unit tests.

End-of-day target:

```text
POST /monitor
→ anomaly detection
→ persistence
→ GET /alerts
```

### Day 2 — AI + Frontend

Deliver:

- LLM adapter;
- fallback generator;
- structured logging;
- React dashboard;
- summary cards;
- active incident table;
- incident details drawer;
- loading / error / empty states;
- event simulator.

End-of-day target:

```text
Simulator
→ backend
→ anomaly
→ LLM/fallback
→ DB
→ dashboard
```

### Day 3 — Hardening and Submission

Do not add major architecture.

Focus on:

- integration tests;
- bug fixes;
- UI polish;
- responsive checks;
- README;
- architecture diagram;
- trade-offs;
- known limitations;
- `AI_Prompts.docx`;
- demo recording;
- GitHub cleanup.

---

## 20. Key Product Positioning

The project is not:

> "an OpenAI wrapper around an API."

It is:

> **An operational monitoring system that uses deterministic logic for technical truth and AI for human interpretation.**

The core product principle:

```text
Rules detect.
Incidents correlate.
AI explains.
Database remembers.
Dashboard communicates.
```
