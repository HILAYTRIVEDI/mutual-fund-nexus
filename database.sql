-- =====================================================
-- MUTUAL FUND NEXUS - COMPLETE DATABASE SETUP
-- 
-- Run this ENTIRE script in Supabase SQL Editor
-- (Dashboard > SQL Editor) for a fresh setup.
--
-- This will:
-- 1. Drop all existing tables (clean slate)
-- 2. Create all tables with proper relationships
-- 3. Set up RLS policies for security
-- 4. Create triggers for auto-profile creation
-- =====================================================

-- =====================================================
-- STEP 0: CLEAN UP (Drop existing tables)
-- Run this only if you want a fresh start
-- =====================================================
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

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (User accounts linked to Supabase Auth)
-- =====================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text CHECK (role IN ('advisor', 'client')) DEFAULT 'advisor',
  avatar_url text,
  -- Email notification preferences
  email_sip_reminders boolean DEFAULT true,
  email_sip_executed boolean DEFAULT true,
  reminder_days_before integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth. Admin/Advisor/Client roles.';
COMMENT ON COLUMN public.profiles.email_sip_reminders IS 'Whether to send email reminders for upcoming SIPs';
COMMENT ON COLUMN public.profiles.email_sip_executed IS 'Whether to send email confirmations when SIPs are executed';
COMMENT ON COLUMN public.profiles.reminder_days_before IS 'Number of days before SIP execution to send reminder (1, 2, or 3)';

-- =====================================================
-- 2. MUTUAL FUNDS (Master Data)
-- =====================================================
CREATE TABLE public.mutual_funds (
  code text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  fund_house text,
  category text,
  type text,
  current_nav numeric,
  last_updated timestamptz
);

COMMENT ON TABLE public.mutual_funds IS 'Master table of mutual fund schemes with current NAV';

-- =====================================================
-- 3. CLIENTS (Managed by Advisors)
-- =====================================================
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  pan text NOT NULL UNIQUE,
  status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  kyc_status text CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.clients IS 'Client records managed by advisors. Clients can have login accounts in profiles table.';

-- =====================================================
-- 4. HOLDINGS (Client Investments)
-- =====================================================
CREATE TABLE public.holdings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  units numeric NOT NULL DEFAULT 0,
  average_price numeric NOT NULL DEFAULT 0,
  invested_amount numeric GENERATED ALWAYS AS (units * average_price) STORED,
  current_nav numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, scheme_code)
);

COMMENT ON TABLE public.holdings IS 'Holdings of mutual funds per client';

-- =====================================================
-- 5. TRANSACTIONS
-- =====================================================
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  type text CHECK (type IN ('buy', 'sell', 'sip', 'switch')) NOT NULL,
  amount numeric NOT NULL,
  units numeric NOT NULL,
  nav numeric NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Transaction history for all client investments';

-- =====================================================
-- 6. SIPS (Systematic Investment Plans)
-- =====================================================
CREATE TABLE public.sips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  amount numeric NOT NULL,
  frequency text CHECK (frequency IN ('monthly', 'quarterly', 'weekly')) DEFAULT 'monthly',
  start_date date NOT NULL,
  next_execution_date date,
  status text CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.sips IS 'SIP configurations for clients';

-- =====================================================
-- 7. NOTIFICATIONS
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

COMMENT ON TABLE public.notifications IS 'In-app notifications for users';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can only access their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- MUTUAL FUNDS: All authenticated users can view
CREATE POLICY "Authenticated users can view mutual funds"
  ON public.mutual_funds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mutual funds"
  ON public.mutual_funds FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mutual funds"
  ON public.mutual_funds FOR UPDATE
  TO authenticated
  USING (true);

-- CLIENTS: Advisors see their clients, Admins see all, Clients see their own record
CREATE POLICY "Advisors can view their own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (advisor_id = auth.uid());



CREATE POLICY "Clients can view their own record"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Advisors can insert their own clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Advisors can update their own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can delete their own clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (advisor_id = auth.uid());

-- HOLDINGS: Access via client relationship
CREATE POLICY "Advisors can view holdings of their clients"
  ON public.holdings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = holdings.client_id
    AND clients.advisor_id = auth.uid()
  ));

CREATE POLICY "Clients can view their own holdings"
  ON public.holdings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = holdings.client_id
    AND clients.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Advisors can manage holdings of their clients"
  ON public.holdings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = holdings.client_id
    AND clients.advisor_id = auth.uid()
  ));

-- TRANSACTIONS: Access via client relationship
CREATE POLICY "Advisors can view transactions of their clients"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = transactions.client_id
    AND clients.advisor_id = auth.uid()
  ));

CREATE POLICY "Clients can view their own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = transactions.client_id
    AND clients.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Advisors can manage transactions of their clients"
  ON public.transactions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = transactions.client_id
    AND clients.advisor_id = auth.uid()
  ));

-- SIPS: Access via client relationship
CREATE POLICY "Advisors can view SIPs of their clients"
  ON public.sips FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = sips.client_id
    AND clients.advisor_id = auth.uid()
  ));

CREATE POLICY "Clients can view their own SIPs"
  ON public.sips FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = sips.client_id
    AND clients.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Advisors can manage SIPs of their clients"
  ON public.sips FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = sips.client_id
    AND clients.advisor_id = auth.uid()
  ));

-- NOTIFICATIONS: Users see their own
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_holdings
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sips
  BEFORE UPDATE ON public.sips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- This trigger creates a profile when a user signs up
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role text := 'advisor';
BEGIN
  -- Check if role is provided in metadata (e.g. created via API)
  IF NEW.raw_user_meta_data->>'role' = 'client' THEN
    new_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
    new_role
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, that's fine
    RETURN NEW;
  WHEN others THEN
    -- Log but don't fail
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- 
-- NEXT STEPS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Go to Authentication > Providers > Email
-- 3. Disable "Confirm email" for testing (optional)
-- 4. Register a new user via the app (Sign Up).
--    They will automatically be an 'advisor' and have full access.
--    No manual SQL update is needed.
--
-- TESTING:
-- Register as advisor -> Manage Clients -> Add Client.
-- Then log in as Client to see their dashboard.
-- =====================================================
