-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Advisors/Users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text check (role in ('admin', 'advisor', 'viewer')) default 'advisor',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. MUTUAL FUNDS (Master Data)
create table public.mutual_funds (
  code text not null primary key, -- Scheme Code
  name text not null,
  fund_house text,
  category text,
  type text,
  current_nav numeric,
  last_updated timestamptz
);

-- RLS for Mutual Funds
alter table public.mutual_funds enable row level security;

create policy "Authenticated users can view mutual funds"
  on public.mutual_funds for select
  to authenticated
  using (true);

-- 3. CLIENTS
create table public.clients (
  id uuid not null default gen_random_uuid() primary key,
  advisor_id uuid references public.profiles(id) on delete set null, -- Keep client even if advisor is deleted/changed? Or cascade? Plan said Profile. Using Profile ID which is same as Auth ID.
  name text not null,
  email text,
  phone text,
  pan text not null unique,
  status text check (status in ('active', 'inactive')) default 'active',
  kyc_status text check (kyc_status in ('pending', 'verified', 'rejected', 'expired')) default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Clients
alter table public.clients enable row level security;

create policy "Advisors can view their own clients"
  on public.clients for select
  to authenticated
  using (auth.uid() = advisor_id);

create policy "Advisors can insert their own clients"
  on public.clients for insert
  to authenticated
  with check (auth.uid() = advisor_id);

create policy "Advisors can update their own clients"
  on public.clients for update
  to authenticated
  using (auth.uid() = advisor_id);

create policy "Advisors can delete their own clients"
  on public.clients for delete
  to authenticated
  using (auth.uid() = advisor_id);


-- 4. HOLDINGS (Client Investments)
create table public.holdings (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheme_code text references public.mutual_funds(code),
  units numeric not null default 0,
  average_price numeric not null default 0,
  invested_amount numeric generated always as (units * average_price) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (client_id, scheme_code)
);

-- RLS for Holdings
alter table public.holdings enable row level security;

-- Policy helper: Check if user is the advisor of the client
-- Can use a join in using clause or a secure function. For simplicity in schema.sql, we'll subquery.
create policy "Advisors can view holdings of their clients"
  on public.holdings for select
  to authenticated
  using (exists (
    select 1 from public.clients
    where clients.id = holdings.client_id
    and clients.advisor_id = auth.uid()
  ));

create policy "Advisors can manage holdings of their clients"
  on public.holdings for all
  to authenticated
  using (exists (
    select 1 from public.clients
    where clients.id = holdings.client_id
    and clients.advisor_id = auth.uid()
  ));

-- 5. TRANSACTIONS
create table public.transactions (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheme_code text references public.mutual_funds(code),
  type text check (type in ('buy', 'sell', 'sip', 'switch')) not null,
  amount numeric not null,
  units numeric not null,
  nav numeric not null,
  status text check (status in ('pending', 'completed', 'failed')) default 'completed',
  date timestamptz not null default now(),
  created_at timestamptz default now()
);

-- RLS for Transactions
alter table public.transactions enable row level security;

create policy "Advisors can view transactions of their clients"
  on public.transactions for select
  to authenticated
  using (exists (
    select 1 from public.clients
    where clients.id = transactions.client_id
    and clients.advisor_id = auth.uid()
  ));

create policy "Advisors can manage transactions of their clients"
  on public.transactions for all
  to authenticated
  using (exists (
    select 1 from public.clients
    where clients.id = transactions.client_id
    and clients.advisor_id = auth.uid()
  ));

-- 6. SIPS
create table public.sips (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheme_code text references public.mutual_funds(code),
  amount numeric not null,
  frequency text check (frequency in ('monthly', 'quarterly', 'weekly')) default 'monthly',
  start_date date not null,
  next_execution_date date,
  status text check (status in ('active', 'paused', 'cancelled')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for SIPs
alter table public.sips enable row level security;

create policy "Advisors can view SIPs of their clients"
  on public.sips for select
  to authenticated
  using (exists (
    select 1 from public.clients
    where clients.id = sips.client_id
    and clients.advisor_id = auth.uid()
  ));

create policy "Advisors can manage SIPs of their clients"
  on public.sips for all
  to authenticated
  using (exists (
    select 1 from public.clients
    where clients.id = sips.client_id
    and clients.advisor_id = auth.uid()
  ));

-- 7. NOTIFICATIONS
create table public.notifications (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text check (type in ('success', 'warning', 'error', 'info')) not null,
  title text not null,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

-- RLS for Notifications
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- TRIGGERS FOR UPDATED_AT
-- Reusable function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_clients
  before update on public.clients
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_holdings
  before update on public.holdings
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_sips
  before update on public.sips
  for each row execute procedure public.handle_updated_at();

-- TRIGGER FOR NEW USER SIGNUP (Optional, assigns to proper Profile)
-- This assumes public.profiles matches auth.users 1:1.
-- You typically set this up to auto-create a profile on auth.users insert.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'advisor');
  return new;
end;
$$ language plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
