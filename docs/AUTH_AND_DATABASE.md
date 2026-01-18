# Authentication & Database Flow

## Overview

This document explains how authentication and database access work in Mutual Fund Nexus.

---

## 1. Authentication Flow

### Login Process

```
User → /login page → Enter email/password
       ↓
AuthContext.login() → supabase.auth.signInWithPassword()
       ↓
Supabase Auth validates credentials
       ↓
On success → Session token stored in HTTP-only cookies
       ↓
AuthContext fetches profile from profiles table
       ↓
User state set → Redirect to dashboard based on role
```

### Session Persistence (Page Refresh)

```
Browser refreshes page
       ↓
proxy.ts runs → supabase.auth.getUser() refreshes session cookie
       ↓
AuthContext.initAuth() → supabase.auth.getSession()
       ↓
Session found → Fetch profile → Set user state → App loads normally
```

### Key Files

| File | Purpose |
|------|---------|
| `src/proxy.ts` | Next.js 16 proxy - refreshes Supabase session on each request |
| `src/lib/supabase.ts` | Browser Supabase client (singleton for consistency) |
| `src/context/AuthContext.tsx` | React context managing auth state and route protection |

---

## 2. Database Schema

### Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User accounts (linked to auth.users) | Users see their own |
| `clients` | Client records managed by advisors | Advisors see their own clients |
| `holdings` | Client investment holdings | Via client → advisor |
| `transactions` | Transaction history | Via client → advisor |
| `sips` | SIP configurations | Via client → advisor |
| `notifications` | User notifications | Users see their own |
| `mutual_funds` | Master fund data | All authenticated users |

### Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (1:1 - created by trigger on signup)
    ↓
clients (1:many - advisor_id → profiles.id)
    ↓
holdings, transactions, sips (1:many - client_id → clients.id)
```

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

- **profiles**: Users can only access their own profile
- **clients**: Advisors can only access clients where `advisor_id = auth.uid()`
- **holdings/transactions/sips**: Access via client relationship

---

## 3. User Roles

| Role | Access |
|------|--------|
| `admin` | Full access (should add admin RLS policies) |
| `advisor` | Can manage their own clients and investments |
| `client` | Can view their own dashboard (via client-dashboard) |
| `viewer` | Read-only access |

---

## 4. Common Issues & Fixes

### Issue: Stuck on loading spinner

**Cause**: Auth context not finishing initialization
**Solution**: Check browser console for `[AuthContext]` logs. Session should be "Found" or "Not found".

### Issue: Clients not showing

**Cause**: RLS policy - `advisor_id` doesn't match logged-in user
**Solution**: 
```sql
-- Check your user ID
SELECT id, email FROM profiles;

-- Check client advisor_id
SELECT id, name, advisor_id FROM clients;

-- Fix: Assign clients to yourself
UPDATE clients SET advisor_id = 'your-uuid-here';
```

### Issue: Adding client logs out admin

**Cause**: Old code used `supabase.auth.signUp()` on client-side
**Solution**: Now uses `/api/clients/create` API route with admin API

---

## 5. Required Environment Variables

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (for admin API)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (optional - for SIP alerts)
RESEND_API_KEY=re_xxx
EMAIL_FROM=Mutual Fund Nexus <noreply@yourdomain.com>
```

---

## 6. Database Setup

Run `schema.sql` in Supabase SQL Editor to set up:
- All tables with proper constraints
- RLS policies
- Triggers (auto-create profile on signup)

To make a user admin:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 7. Debugging Tips

1. **Check browser console** for `[AuthContext]`, `[ClientContext]`, etc. logs
2. **Check Supabase Dashboard** → Authentication → Users to see registered users
3. **Check Supabase Dashboard** → Table Editor → profiles to see profiles
4. **Use Supabase SQL Editor** to query data directly
