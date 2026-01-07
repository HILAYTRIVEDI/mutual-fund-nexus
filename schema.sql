-- =====================================================
-- MUTUAL FUND NEXUS - FRESH DATABASE SETUP
-- 
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- for a brand new Supabase project
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (User accounts linked to Supabase Auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text CHECK (role IN ('admin', 'advisor', 'viewer', 'client')) DEFAULT 'advisor',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. MUTUAL FUNDS (Master Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mutual_funds (
  code text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  fund_house text,
  category text,
  type text,
  current_nav numeric,
  last_updated timestamptz
);

-- RLS for Mutual Funds
ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mutual funds"
  ON public.mutual_funds FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. CLIENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clients (
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

-- RLS for Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert their own clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update their own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete their own clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (auth.uid() = advisor_id);

-- =====================================================
-- 4. HOLDINGS (Client Investments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheme_code text REFERENCES public.mutual_funds(code),
  units numeric NOT NULL DEFAULT 0,
  average_price numeric NOT NULL DEFAULT 0,
  invested_amount numeric GENERATED ALWAYS AS (units * average_price) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, scheme_code)
);

-- RLS for Holdings
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view holdings of their clients"
  ON public.holdings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = holdings.client_id
    AND clients.advisor_id = auth.uid()
  ));

CREATE POLICY "Advisors can manage holdings of their clients"
  ON public.holdings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = holdings.client_id
    AND clients.advisor_id = auth.uid()
  ));

-- =====================================================
-- 5. TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
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

-- RLS for Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view transactions of their clients"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = transactions.client_id
    AND clients.advisor_id = auth.uid()
  ));

CREATE POLICY "Advisors can manage transactions of their clients"
  ON public.transactions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = transactions.client_id
    AND clients.advisor_id = auth.uid()
  ));

-- =====================================================
-- 6. SIPS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sips (
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

-- RLS for SIPs
ALTER TABLE public.sips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view SIPs of their clients"
  ON public.sips FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = sips.client_id
    AND clients.advisor_id = auth.uid()
  ));

CREATE POLICY "Advisors can manage SIPs of their clients"
  ON public.sips FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = sips.client_id
    AND clients.advisor_id = auth.uid()
  ));

-- =====================================================
-- 7. NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('success', 'warning', 'error', 'info')) NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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

-- Reusable function to update updated_at timestamp
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
-- This is the key trigger that creates a profile when
-- a user signs up via Supabase Auth
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
    'advisor'
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
-- Next steps:
-- 1. Go to Authentication > Providers > Email
-- 2. Disable "Confirm email" for testing
-- 3. Register a new user via the app
-- 
-- To make a user admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- =====================================================
