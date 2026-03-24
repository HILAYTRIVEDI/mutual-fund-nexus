-- Add NSE order ID column to transactions for allotment sync
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS nse_order_id text;

-- Index for efficient lookup by NSE order ID
CREATE INDEX IF NOT EXISTS idx_transactions_nse_order_id
    ON public.transactions (nse_order_id)
    WHERE nse_order_id IS NOT NULL;
