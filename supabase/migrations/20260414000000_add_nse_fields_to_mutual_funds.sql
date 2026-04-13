-- Add NSE-specific fields to mutual_funds table
-- nse_code: NSE's internal scheme code (used for MASTER_DOWNLOAD NAV lookup)
-- isin_value: ISIN for the growth option (used to match against NSE scheme master)

ALTER TABLE public.mutual_funds
    ADD COLUMN IF NOT EXISTS nse_code text,
    ADD COLUMN IF NOT EXISTS isin_value text;

-- Index for fast NSE code lookups
CREATE INDEX IF NOT EXISTS idx_mutual_funds_nse_code
    ON public.mutual_funds (nse_code)
    WHERE nse_code IS NOT NULL;

-- Index for ISIN-based matching (used by sync-scheme-codes)
CREATE INDEX IF NOT EXISTS idx_mutual_funds_isin_value
    ON public.mutual_funds (isin_value)
    WHERE isin_value IS NOT NULL;
