-- =====================================================
-- 7. SETTLEMENT TRACKING
-- =====================================================

-- Table for tracking pending mutual fund sales
CREATE TABLE public.pending_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  units_sold numeric NOT NULL,
  expected_amount numeric NOT NULL,
  sell_date timestamptz NOT NULL DEFAULT now(),
  expected_settlement_date date NOT NULL,
  status text CHECK (status IN ('processing', 'pending_nse_confirmation', 'failed')) DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table for archiving settled mutual fund sales
CREATE TABLE public.settlement_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  original_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  units_sold numeric NOT NULL,
  settled_amount numeric NOT NULL,
  sell_date timestamptz NOT NULL,
  actual_settlement_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- RLS POLICIES FOR SETTLEMENTS
-- =====================================================

ALTER TABLE public.pending_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_archive ENABLE ROW LEVEL SECURITY;

-- PENDING SETTLEMENTS
CREATE POLICY "Users can view own pending settlements"
  ON public.pending_settlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view client pending settlements"
  ON public.pending_settlements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = pending_settlements.user_id
    AND profiles.advisor_id = auth.uid()
  ));

CREATE POLICY "Users can manage own pending settlements"
  ON public.pending_settlements FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage client pending settlements"
  ON public.pending_settlements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = pending_settlements.user_id
    AND profiles.advisor_id = auth.uid()
  ));

-- SETTLEMENT ARCHIVE
CREATE POLICY "Users can view own settlement archive"
  ON public.settlement_archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view client settlement archive"
  ON public.settlement_archive FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = settlement_archive.user_id
    AND profiles.advisor_id = auth.uid()
  ));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER handle_updated_at_pending_settlements
  BEFORE UPDATE ON public.pending_settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Note: The Python backend will be responsible for inserting into pending_settlements
-- upon a sell transaction, and migrating data to settlement_archive when confirmed via NSE API.
