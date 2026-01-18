// Database types generated from schema.sql
// These types map to the Supabase tables with RLS policies

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Profile (Admin/Client)
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'client';
  advisor_id: string | null;  // For clients: links to their admin
  phone: string | null;
  pan: string | null;
  kyc_status: 'pending' | 'verified' | 'rejected' | 'expired' | null;
  notes: string | null;
  avatar_url: string | null;
  email_sip_reminders: boolean;
  email_sip_executed: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
}

// Mutual Fund (Master Data)
export interface MutualFund {
  code: string;
  name: string;
  fund_house: string | null;
  category: string | null;
  type: string | null;
  current_nav: number | null;
  last_updated: string | null;
}

// Holding (User Investment) - now linked to profiles.id
export interface Holding {
  id: string;
  user_id: string;  // References profiles.id
  scheme_code: string | null;
  units: number;
  average_price: number;
  invested_amount: number; // Generated column
  current_nav?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  mutual_fund?: MutualFund;
  profile?: Profile;  // For admin viewing client holdings
}

// Transaction
export interface Transaction {
  id: string;
  user_id: string;  // References profiles.id
  scheme_code: string | null;
  type: 'buy' | 'sell' | 'sip' | 'switch';
  amount: number;
  units: number;
  nav: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  created_at: string;
  // Joined data
  mutual_fund?: MutualFund;
  profile?: Profile;
}

// SIP
export interface SIP {
  id: string;
  user_id: string;  // References profiles.id
  scheme_code: string | null;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'weekly';
  start_date: string;
  next_execution_date: string | null;
  status: 'active' | 'paused' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Joined data
  mutual_fund?: MutualFund;
  profile?: Profile;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      mutual_funds: {
        Row: MutualFund;
        Insert: MutualFund;
        Update: Partial<Omit<MutualFund, 'code'>>;
      };
      holdings: {
        Row: Holding;
        Insert: Omit<Holding, 'id' | 'invested_amount' | 'created_at' | 'updated_at' | 'mutual_fund' | 'profile'>;
        Update: Partial<Omit<Holding, 'id' | 'invested_amount' | 'created_at' | 'updated_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'mutual_fund' | 'profile'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      sips: {
        Row: SIP;
        Insert: Omit<SIP, 'id' | 'created_at' | 'updated_at' | 'mutual_fund' | 'profile'>;
        Update: Partial<Omit<SIP, 'id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
    };
  };
}

// Helper types for insert/update operations
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type HoldingInsert = Database['public']['Tables']['holdings']['Insert'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type SIPInsert = Database['public']['Tables']['sips']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

