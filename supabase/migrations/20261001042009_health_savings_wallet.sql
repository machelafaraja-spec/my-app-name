/*
# Health Savings Wallet (Akiba ya Afya)

## Overview
Adds a prepaid health savings wallet for each patient profile, supporting micro-deposits,
auto-save goals, and automatic deduction for medical services. Includes a full transaction
ledger for transparency.

## 1. New Tables
- `health_savings_wallets` — One wallet per patient profile
  - profile_id (uuid, unique FK to profiles)
  - balance (numeric, current available balance, default 0)
  - total_saved (numeric, lifetime total deposited, default 0)
  - total_spent (numeric, lifetime total deducted, default 0)
  - savings_goal (numeric, optional monthly savings target, nullable)
  - goal_label (text, optional description e.g. "Family Health Emergency")
  - auto_save_enabled (boolean, default false)
  - auto_save_amount (numeric, monthly auto-save amount if enabled, nullable)
  - auto_save_day (integer, day of month for auto-save, 1-28, default 1)
  - created_at, updated_at

- `health_savings_transactions` — Transaction ledger for each wallet
  - wallet_id (uuid FK to health_savings_wallets)
  - profile_id (uuid FK to profiles, for direct patient queries)
  - type (text: 'deposit' | 'deduction' | 'goal_set' | 'goal_update')
  - amount (numeric, positive for deposit, positive for deduction amount)
  - channel (text: 'mpesa' | 'tigo' | 'airtel' | 'azam' | 'crdb' | 'nmb' | 'visa' | 'mastercard' | 'wallet' | 'hybrid')
  - description (text, what the transaction was for)
  - reference_id (uuid, optional — links to pharmacy_orders, lab_tests, or consultations)
  - balance_after (numeric, wallet balance after this transaction)
  - transaction_id (text, unique payment reference e.g. TXN...)
  - created_at

## 2. Security
- RLS enabled on both tables with `TO anon, authenticated` (no-auth app, shared data model).
- Full CRUD for anon + authenticated, consistent with existing schema.

## 3. Important Notes
- A trigger `ensure_patient_wallet` auto-creates a wallet when a patient profile is inserted.
- Balance is maintained incrementally: deposits add to balance + total_saved, deductions subtract from balance and add to total_spent.
- balance_after on each transaction provides a full audit trail.
- Indexes on profile_id and wallet_id for fast lookups.
*/

-- ── Health savings wallets table ──
CREATE TABLE IF NOT EXISTS health_savings_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  total_saved numeric(12,2) NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  savings_goal numeric(12,2),
  goal_label text,
  auto_save_enabled boolean NOT NULL DEFAULT false,
  auto_save_amount numeric(12,2),
  auto_save_day integer DEFAULT 1 CHECK (auto_save_day >= 1 AND auto_save_day <= 28),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE health_savings_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hsw" ON health_savings_wallets;
CREATE POLICY "anon_select_hsw" ON health_savings_wallets FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hsw" ON health_savings_wallets;
CREATE POLICY "anon_insert_hsw" ON health_savings_wallets FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hsw" ON health_savings_wallets;
CREATE POLICY "anon_update_hsw" ON health_savings_wallets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hsw" ON health_savings_wallets;
CREATE POLICY "anon_delete_hsw" ON health_savings_wallets FOR DELETE
  TO anon, authenticated USING (true);

-- ── Health savings transactions table ──
CREATE TABLE IF NOT EXISTS health_savings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES health_savings_wallets(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'deduction', 'goal_set', 'goal_update')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'wallet',
  description text NOT NULL DEFAULT '',
  reference_id uuid,
  balance_after numeric(12,2) NOT NULL DEFAULT 0,
  transaction_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE health_savings_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hst" ON health_savings_transactions;
CREATE POLICY "anon_select_hst" ON health_savings_transactions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hst" ON health_savings_transactions;
CREATE POLICY "anon_insert_hst" ON health_savings_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hst" ON health_savings_transactions;
CREATE POLICY "anon_update_hst" ON health_savings_transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hst" ON health_savings_transactions;
CREATE POLICY "anon_delete_hst" ON health_savings_transactions FOR DELETE
  TO anon, authenticated USING (true);

-- ── Auto-create wallet trigger ──
CREATE OR REPLACE FUNCTION ensure_patient_wallet()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'patient' THEN
    INSERT INTO health_savings_wallets (profile_id) VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_patient_wallet ON profiles;
CREATE TRIGGER trg_ensure_patient_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_patient_wallet();

-- ── Backfill wallets for existing patients ──
INSERT INTO health_savings_wallets (profile_id)
SELECT id FROM profiles WHERE role = 'patient'
ON CONFLICT (profile_id) DO NOTHING;

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_hsw_profile_id ON health_savings_wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_hst_wallet_id ON health_savings_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_hst_profile_id ON health_savings_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_hst_type ON health_savings_transactions(type);
CREATE INDEX IF NOT EXISTS idx_hst_created_at ON health_savings_transactions(created_at DESC);
