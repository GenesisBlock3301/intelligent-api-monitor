import type { Pool } from "pg";

import type {
  AlertSource,
  AnomalyType,
  ApiHealthEvent,
  Incident,
  IncidentStatus,
  Severity,
} from "../domain/contracts.js";

type IncidentRow = Omit<Incident, "anomaly_types" | "severity" | "alert_source" | "status"> & {
  anomaly_types: AnomalyType[] | string;
  severity: string;
  alert_source: string;
  status: string;
};

export interface CreateIncidentInput {
  fingerprint: string;
  event: ApiHealthEvent;
  anomalyTypes: AnomalyType[];
  severity: Severity;
  alertMessage: string;
  alertSource: AlertSource;
  observedAt?: Date;
}

function mapIncident(row: IncidentRow): Incident {
  return {
    ...row,
    anomaly_types: typeof row.anomaly_types === "string"
      ? JSON.parse(row.anomaly_types) as AnomalyType[]
      : row.anomaly_types,
    severity: row.severity as Severity,
    alert_source: row.alert_source as AlertSource,
    status: row.status as IncidentStatus,
  };
}

export class IncidentRepository {
  constructor(private readonly pool: Pool) {}

  async findActiveByFingerprint(fingerprint: string): Promise<Incident | null> {
    const result = await this.pool.query<IncidentRow>(
      `SELECT * FROM incidents
       WHERE fingerprint = $1 AND status = 'ACTIVE'
       ORDER BY last_seen_at DESC
       LIMIT 1`,
      [fingerprint],
    );

    return result.rows[0] ? mapIncident(result.rows[0]) : null;
  }

  async create(input: CreateIncidentInput): Promise<Incident> {
    const observedAt = input.observedAt ?? new Date();
    const result = await this.pool.query<IncidentRow>(
      `INSERT INTO incidents (
        fingerprint, api_name, anomaly_types, severity, status_code,
        response_time_ms, records_returned, alert_message, alert_source,
        first_seen_at, last_seen_at, created_at, updated_at
      ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $10, $10, $10)
      ON CONFLICT (fingerprint) WHERE status = 'ACTIVE'
      DO UPDATE SET
        occurrence_count = incidents.occurrence_count + 1,
        status_code = EXCLUDED.status_code,
        response_time_ms = EXCLUDED.response_time_ms,
        records_returned = EXCLUDED.records_returned,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        input.fingerprint,
        input.event.api_name,
        JSON.stringify(input.anomalyTypes),
        input.severity,
        input.event.status_code,
        input.event.response_time_ms,
        input.event.records_returned,
        input.alertMessage,
        input.alertSource,
        observedAt,
      ],
    );

    return mapIncident(result.rows[0]);
  }

  async incrementOccurrence(id: string, event: ApiHealthEvent, observedAt = new Date()): Promise<Incident | null> {
    const result = await this.pool.query<IncidentRow>(
      `UPDATE incidents
       SET occurrence_count = occurrence_count + 1,
           status_code = $2,
           response_time_ms = $3,
           records_returned = $4,
           last_seen_at = $5,
           updated_at = $5
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING *`,
      [id, event.status_code, event.response_time_ms, event.records_returned, observedAt],
    );

    return result.rows[0] ? mapIncident(result.rows[0]) : null;
  }

  async findActive(limit = 100): Promise<Incident[]> {
    const result = await this.pool.query<IncidentRow>(
      `SELECT * FROM incidents
       WHERE status = 'ACTIVE'
       ORDER BY last_seen_at DESC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(mapIncident);
  }

  async findById(id: string): Promise<Incident | null> {
    const result = await this.pool.query<IncidentRow>("SELECT * FROM incidents WHERE id = $1", [id]);
    return result.rows[0] ? mapIncident(result.rows[0]) : null;
  }
}
