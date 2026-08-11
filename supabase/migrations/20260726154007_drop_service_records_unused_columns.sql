-- Remove unused service record fields (status, cost, assignee, notes).
-- All records are treated as completed via completion_date going forward.

ALTER TABLE public.service_records
  DROP COLUMN IF EXISTS cost,
  DROP COLUMN IF EXISTS person_in_charge,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS notes;
