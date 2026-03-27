-- Migration: Add NAV Update Trigger for Holdings
-- Creates a function and trigger to automatically update holding valuations when a mutual fund's NAV changes.

-- 1. Create the PL/pgSQL function
CREATE OR REPLACE FUNCTION update_holdings_on_nav_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if the current_nav has actually changed
    IF NEW.current_nav IS NOT NULL AND NEW.current_nav IS DISTINCT FROM OLD.current_nav THEN
        -- Update all holdings associated with this mutual fund scheme
        UPDATE holdings
        SET 
            current_nav = NEW.current_nav,
            updated_at = NOW()
        WHERE scheme_code = NEW.code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the mutual_funds table
DROP TRIGGER IF EXISTS on_nav_change ON mutual_funds;

CREATE TRIGGER on_nav_change
AFTER UPDATE OF current_nav ON mutual_funds
FOR EACH ROW
EXECUTE FUNCTION update_holdings_on_nav_change();

-- 3. (Optional but recommended) Backfill existing holdings
-- This ensures all current holdings reflect the latest mutual_funds NAV immediately after migration
UPDATE holdings h
SET 
    current_nav = mf.current_nav
FROM mutual_funds mf
WHERE h.scheme_code = mf.code
AND mf.current_nav IS NOT NULL
AND (h.current_nav IS DISTINCT FROM mf.current_nav);
