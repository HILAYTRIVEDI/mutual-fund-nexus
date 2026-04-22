-- Add sip_id column to transactions for idempotency and audit trail
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS sip_id uuid REFERENCES public.sips(id) ON DELETE SET NULL;

-- Index for fast dedup lookups during SIP processing
CREATE INDEX IF NOT EXISTS idx_transactions_sip_id ON public.transactions(sip_id);
