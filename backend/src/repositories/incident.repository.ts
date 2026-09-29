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

  async findActive(limit = 20, offset = 0): Promise<{ data: Incident[]; total: number; summary: { critical: number; high: number; medium: number; affectedApis: number } }> {
    const [rows, statsRow] = await Promise.all([
      this.pool.query<IncidentRow>(
        `SELECT * FROM incidents
         WHERE status = 'ACTIVE'
         ORDER BY last_seen_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      this.pool.query<{ total: string; critical: string; high: string; medium: string; affected_apis: string }>(
        `SELECT
           count(*)::text AS total,
           count(*) FILTER (WHERE severity = 'CRITICAL')::text AS critical,
           count(*) FILTER (WHERE severity = 'HIGH')::text AS high,
           count(*) FILTER (WHERE severity = 'MEDIUM')::text AS medium,
           count(DISTINCT api_name)::text AS affected_apis
         FROM incidents WHERE status = 'ACTIVE'`,
      ),
    ]);

    const stats = statsRow.rows[0];
    return {
      data: rows.rows.map(mapIncident),
      total: Number(stats.total),
      summary: {
        critical: Number(stats.critical),
        high: Number(stats.high),
        medium: Number(stats.medium),
        affectedApis: Number(stats.affected_apis),
      },
    };
  }

  async resolve(id: string): Promise<Incident | null> {
    const now = new Date();
    const result = await this.pool.query<IncidentRow>(
      `UPDATE incidents
       SET status = 'RESOLVED', resolved_at = $2, updated_at = $2
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING *`,
      [id, now],
    );
    return result.rows[0] ? mapIncident(result.rows[0]) : null;
  }

  async findPaginated(
    status: "ACTIVE" | "RESOLVED" | "ALL",
    limit = 20,
    offset = 0,
  ): Promise<{ data: Incident[]; total: number; summary: { active: number; critical: number; high: number; medium: number; affectedApis: number; resolved: number } }> {
    const statusClause = status === "ALL" ? "" : "WHERE status = $3";
    const params = status === "ALL" ? [limit, offset] : [limit, offset, status];

    const countClause = status === "ALL" ? "" : "WHERE status = $1";
    const countParams = status === "ALL" ? [] : [status];

    const [rows, countRow, globalStatsRow] = await Promise.all([
      this.pool.query<IncidentRow>(
        `SELECT * FROM incidents
         ${statusClause}
         ORDER BY last_seen_at DESC, created_at DESC
         LIMIT $1 OFFSET $2`,
        params,
      ),
      this.pool.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM incidents ${countClause}`,
        countParams,
      ),
      this.pool.query<{ active: string; resolved: string; critical: string; high: string; medium: string; affected_apis: string }>(
        `SELECT
           count(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
           count(*) FILTER (WHERE status = 'RESOLVED')::text AS resolved,
           count(*) FILTER (WHERE severity = 'CRITICAL' AND status = 'ACTIVE')::text AS critical,
           count(*) FILTER (WHERE severity = 'HIGH' AND status = 'ACTIVE')::text AS high,
           count(*) FILTER (WHERE severity = 'MEDIUM' AND status = 'ACTIVE')::text AS medium,
           count(DISTINCT api_name) FILTER (WHERE status = 'ACTIVE')::text AS affected_apis
         FROM incidents`,
      ),
    ]);

    const globalStats = globalStatsRow.rows[0];
    return {
      data: rows.rows.map(mapIncident),
      total: Number(countRow.rows[0].total),
      summary: {
        active: Number(globalStats.active),
        resolved: Number(globalStats.resolved),
        critical: Number(globalStats.critical),
        high: Number(globalStats.high),
        medium: Number(globalStats.medium),
        affectedApis: Number(globalStats.affected_apis),
      },
    };
  }

  async findById(id: string): Promise<Incident | null> {
    const result = await this.pool.query<IncidentRow>("SELECT * FROM incidents WHERE id = $1", [id]);
    return result.rows[0] ? mapIncident(result.rows[0]) : null;
  }
}
