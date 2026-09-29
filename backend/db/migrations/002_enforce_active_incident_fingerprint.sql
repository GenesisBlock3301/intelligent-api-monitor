WITH duplicate_groups AS (
  SELECT
    fingerprint,
    (array_agg(id ORDER BY first_seen_at ASC))[1] AS keeper_id,
    SUM(occurrence_count)::INTEGER AS total_occurrences,
    MIN(first_seen_at) AS earliest_seen_at,
    MAX(last_seen_at) AS latest_seen_at
  FROM incidents
  WHERE status = 'ACTIVE'
  GROUP BY fingerprint
  HAVING COUNT(*) > 1
), updated_keepers AS (
  UPDATE incidents AS incident
  SET
    occurrence_count = duplicate_groups.total_occurrences,
    first_seen_at = duplicate_groups.earliest_seen_at,
    last_seen_at = duplicate_groups.latest_seen_at,
    updated_at = NOW()
  FROM duplicate_groups
  WHERE incident.id = duplicate_groups.keeper_id
  RETURNING incident.id
)
DELETE FROM incidents AS incident
USING duplicate_groups
WHERE incident.fingerprint = duplicate_groups.fingerprint
  AND incident.id <> duplicate_groups.keeper_id
  AND incident.status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS incidents_active_fingerprint_unique_idx
  ON incidents (fingerprint)
  WHERE status = 'ACTIVE';
