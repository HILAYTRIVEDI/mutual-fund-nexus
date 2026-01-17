-- =====================================================
-- EMAIL NOTIFICATION PREFERENCES MIGRATION
-- 
-- Run this in Supabase SQL Editor to add email
-- notification preferences to the profiles table
-- =====================================================

-- Add email notification preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_sip_reminders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_sip_executed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 2;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.email_sip_reminders IS 'Whether to send email reminders for upcoming SIPs';
COMMENT ON COLUMN public.profiles.email_sip_executed IS 'Whether to send email confirmations when SIPs are executed';
COMMENT ON COLUMN public.profiles.reminder_days_before IS 'Number of days before SIP execution to send reminder (1, 2, or 3)';

-- =====================================================
-- FIX: Update default role to 'client' for new signups
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
    'client'  -- Changed from 'advisor' to 'client'
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

-- =====================================================
-- FIX: Add admin policy to view all clients
-- This allows admins to see all clients in the system
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;

-- Create policy for admins to view all clients
CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- OPTIONAL: View to check current settings
-- =====================================================
-- SELECT id, email, full_name, role, email_sip_reminders, email_sip_executed, reminder_days_before
-- FROM public.profiles;

-- To make yourself an admin (replace with your email):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';

-- To update an existing user's advisor_id for their clients:
-- UPDATE public.clients SET advisor_id = 'your-user-uuid' WHERE advisor_id IS NULL;
