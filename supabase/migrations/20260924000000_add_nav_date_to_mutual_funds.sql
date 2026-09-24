-- Add nav_date to mutual_funds
-- nav_date: the date the NAV applies to, as published by the source (AMFI / NSE / MFAPI).
-- last_updated remains the time the refresh job ran.

ALTER TABLE public.mutual_funds
    ADD COLUMN IF NOT EXISTS nav_date date;
