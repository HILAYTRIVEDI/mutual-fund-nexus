-- Cache of the full NSE scheme universe.
-- Populated weekly by /api/cron/sync-scheme-codes (NSE MASTER_DOWNLOAD).
-- Used by /api/mf/search to surface NSE-listed schemes missing from MFAPI search.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.nse_scheme_master (
  scheme_code text NOT NULL PRIMARY KEY,
  scheme_name text NOT NULL,
  isin text,
  amc_code text,
  scheme_type text,
  current_nav numeric,
  nav_date text,
  last_synced timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nse_scheme_master_isin
  ON public.nse_scheme_master (isin);

CREATE INDEX IF NOT EXISTS idx_nse_scheme_master_name_trgm
  ON public.nse_scheme_master USING gin (scheme_name gin_trgm_ops);

ALTER TABLE public.nse_scheme_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read nse_scheme_master" ON public.nse_scheme_master;

CREATE POLICY "Anyone can read nse_scheme_master"
  ON public.nse_scheme_master FOR SELECT
  TO authenticated
  USING (true);
