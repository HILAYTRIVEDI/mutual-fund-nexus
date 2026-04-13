-- =====================================================
-- RUACAPITAL - SIMPLIFIED DATABASE SETUP
-- 
-- SIMPLIFIED MODEL:
-- - profiles: ALL users (admin & client) in one table
-- - No separate clients table
-- - Holdings/SIPs/Transactions link directly to profiles
-- =====================================================

-- Clean up existing tables
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.sips CASCADE;
DROP TABLE IF EXISTS public.holdings CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.mutual_funds CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES - ALL USERS (Admin & Client)
-- =====================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role text CHECK (role IN ('admin', 'client')) DEFAULT 'admin',
  
  -- Admin reference (for clients only)
  advisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Client-specific fields (null for admins)
  phone text,
  pan text,
  aadhar text,
  kyc_status text CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  notes text,
  
  -- Settings
  avatar_url text,
  email_sip_reminders boolean DEFAULT true,
  email_sip_executed boolean DEFAULT true,
  reminder_days_before integer DEFAULT 2,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'All users - both admins and clients. Clients have advisor_id pointing to their admin.';

-- =====================================================
-- 2. MUTUAL FUNDS (Master Data - unchanged)
-- =====================================================
CREATE TABLE public.mutual_funds (
  code text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  fund_house text,
  category text,
  type text,
  current_nav numeric,
  last_updated timestamptz,
  nse_code text,        -- NSE internal scheme code (for MASTER_DOWNLOAD NAV lookup)
  isin_value text       -- ISIN growth option (for matching against NSE scheme master)
);

-- =====================================================
-- 3. HOLDINGS - Linked to profiles.id directly
-- =====================================================
CREATE TABLE public.holdings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  units numeric NOT NULL DEFAULT 0,
  average_price numeric NOT NULL DEFAULT 0,
  invested_amount numeric GENERATED ALWAYS AS (units * average_price) STORED,
  current_nav numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, scheme_code)
);

-- =====================================================
-- 4. TRANSACTIONS
-- =====================================================
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  type text CHECK (type IN ('buy', 'sell', 'sip', 'switch')) NOT NULL,
  amount numeric NOT NULL,
  units numeric NOT NULL,
  nav numeric NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. SIPS (Systematic Investment Plans)
-- =====================================================
CREATE TABLE public.sips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  amount numeric NOT NULL,
  frequency text CHECK (frequency IN ('monthly', 'quarterly', 'weekly')) DEFAULT 'monthly',
  start_date date NOT NULL,
  next_execution_date date,
  status text CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
  step_up_amount numeric DEFAULT 0,
  step_up_interval text CHECK (step_up_interval IN ('Yearly', 'Half-Yearly', 'Quarterly')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('success', 'warning', 'error', 'info')) NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view their clients' profiles
CREATE POLICY "Admins can view their clients"
  ON public.profiles FOR SELECT
  USING (advisor_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update their clients' profiles
CREATE POLICY "Admins can update their clients"
  ON public.profiles FOR UPDATE
  USING (advisor_id = auth.uid());

-- Users can insert their own profile (for trigger)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can insert client profiles (requires service role in practice)
CREATE POLICY "Admins can insert client profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (advisor_id = auth.uid());

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view their clients' profiles
CREATE POLICY "Admins can view client profiles"
  ON public.profiles FOR SELECT
  USING (advisor_id = auth.uid());

-- Admins can delete their clients
CREATE POLICY "Admins can delete client profiles"
  ON public.profiles FOR DELETE
  USING (advisor_id = auth.uid());

-- MUTUAL FUNDS - Everyone can read
CREATE POLICY "Anyone can read mutual funds"
  ON public.mutual_funds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert mutual funds"
  ON public.mutual_funds FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update mutual funds"
  ON public.mutual_funds FOR UPDATE
  TO authenticated
  USING (true);

-- HOLDINGS POLICIES
-- Users can see their own holdings
CREATE POLICY "Users can view own holdings"
  ON public.holdings FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see their clients' holdings
CREATE POLICY "Admins can view client holdings"
  ON public.holdings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = holdings.user_id
    AND profiles.advisor_id = auth.uid()
  ));

-- Users/Admins can manage holdings
CREATE POLICY "Users can manage own holdings"
  ON public.holdings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage client holdings"
  ON public.holdings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = holdings.user_id
    AND profiles.advisor_id = auth.uid()
  ));

-- TRANSACTIONS POLICIES (same pattern)
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view client transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = transactions.user_id
    AND profiles.advisor_id = auth.uid()
  ));

CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage client transactions"
  ON public.transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = transactions.user_id
    AND profiles.advisor_id = auth.uid()
  ));

-- SIPS POLICIES (same pattern)
CREATE POLICY "Users can view own SIPs"
  ON public.sips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view client SIPs"
  ON public.sips FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = sips.user_id
    AND profiles.advisor_id = auth.uid()
  ));

CREATE POLICY "Users can manage own SIPs"
  ON public.sips FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage client SIPs"
  ON public.sips FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = sips.user_id
    AND profiles.advisor_id = auth.uid()
  ));

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_holdings
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sips
  BEFORE UPDATE ON public.sips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role text := 'admin';
  new_advisor_id uuid := NULL;
BEGIN
  -- Check metadata for role (set by API when creating clients)
  IF NEW.raw_user_meta_data->>'role' = 'client' THEN
    new_role := 'client';
    new_advisor_id := (NEW.raw_user_meta_data->>'advisor_id')::uuid;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, advisor_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
    new_role,
    new_advisor_id
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DONE! 
-- 
-- New simplified flow:
-- 1. Admin signs up -> gets profile with role='admin'
-- 2. Admin creates client via API -> auth user created with 
--    metadata {role: 'client', advisor_id: admin's id}
-- 3. Trigger creates profile with role='client', advisor_id set
-- 4. Client can login and see their dashboard
-- 5. Admin can see all their clients in profiles table
-- =====================================================
