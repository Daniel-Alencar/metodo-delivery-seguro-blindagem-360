
-- 1. Enum extensions (Postgres requires committed enum values before they can be used)
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'graduated';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'archiving';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE incident_category ADD VALUE IF NOT EXISTS 'consultation';
