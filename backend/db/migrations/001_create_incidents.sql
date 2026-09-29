CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL,
  api_name TEXT NOT NULL,
  anomaly_types JSONB NOT NULL CHECK (jsonb_typeof(anomaly_types) = 'array'),
  severity TEXT NOT NULL CHECK (severity IN ('MEDIUM', 'HIGH', 'CRITICAL')),
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  records_returned INTEGER NOT NULL CHECK (records_returned >= 0),
  alert_message TEXT NOT NULL,
  alert_source TEXT NOT NULL CHECK (alert_source IN ('LLM', 'FALLBACK')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count >= 1),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incidents_fingerprint_idx ON incidents (fingerprint);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_severity_idx ON incidents (severity);
CREATE INDEX IF NOT EXISTS incidents_api_name_idx ON incidents (api_name);
CREATE INDEX IF NOT EXISTS incidents_last_seen_at_idx ON incidents (last_seen_at DESC);
