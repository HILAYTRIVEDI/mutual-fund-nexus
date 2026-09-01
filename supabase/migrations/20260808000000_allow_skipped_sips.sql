ALTER TABLE public.sips
  DROP CONSTRAINT IF EXISTS sips_status_check;

ALTER TABLE public.sips
  ADD CONSTRAINT sips_status_check
  CHECK (status IN ('active', 'paused', 'skipped', 'cancelled'));
