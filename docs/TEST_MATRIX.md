# Core Test Matrix

| Scenario | Coverage |
| --- | --- |
| Healthy event | `anomaly-detector.test.ts`, `monitoring.service.test.ts` |
| HTTP 500 failure | `anomaly-detector.test.ts` |
| High latency | `anomaly-detector.test.ts` |
| Zero records | `anomaly-detector.test.ts` |
| Combined anomalies | `anomaly-detector.test.ts` |
| Severity mapping | `severity-policy.test.ts` |
| Duplicate aggregation | `monitor.routes.integration.test.ts` |
| GET alerts | `monitor.routes.integration.test.ts` |
| LLM success | `monitoring.service.test.ts`, `openai-alert-generator.test.ts` |
| LLM failure fallback | `monitoring.service.test.ts` |
| Invalid input | `monitor.schema.test.ts`, `monitor.routes.integration.test.ts` |
| Batch processing | `monitor.routes.integration.test.ts` |

Run source tests with `npm test --prefix backend`. Run PostgreSQL-backed tests with `npm run test:integration --prefix backend` after PostgreSQL is available.
