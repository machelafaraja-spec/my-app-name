/*
# Hospital Module: Staff Role, Patient Transfers, Huddle/CME Sessions

1. Changes
- Add `hospital_staff` to the profiles role CHECK constraint so hospital admin/staff accounts can exist.
- Create `patient_transfers` table: inter-departmental patient tracking across hospital units (ICU, OPD, Emergency, Theatre, Radiology) until discharge.
- Create `huddle_sessions` table: multi-party video conference sessions for morning huddles, shift handovers, and CME/specialist mentorship.
- Seed: assign existing doctors to hospitals and create hospital_staff profile.

2. New Tables
- `patient_transfers`: Tracks patient movement between hospital units. Columns: patient_id, patient_name, hospital_id, from_unit, to_unit, transfer_reason, attending_staff_id, attending_staff_name, status, admitted_at, discharged_at.
- `huddle_sessions`: Video conference sessions for hospital staff. Columns: hospital_id, title, session_type, host_id, host_name, status, join_link, started_at, ended_at.

3. Security
- RLS enabled on both new tables with `TO anon, authenticated` full CRUD (no-auth demo app).

4. Notes
- `hospital_staff` role is for hospital admin/staff who access internal units, patient transfers, and the CME/huddle hub.
- Realtime enabled on both new tables for live updates.
*/

-- Step 1: Add hospital_staff to profiles role CHECK constraint
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('patient', 'doctor', 'pharmacist', 'lab_tech', 'hospital_staff'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 2: patient_transfers table
CREATE TABLE IF NOT EXISTS patient_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  from_unit text,
  to_unit text NOT NULL,
  transfer_reason text,
  attending_staff_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  attending_staff_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'discharged')),
  admitted_at timestamptz DEFAULT now(),
  discharged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patient_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_patient_transfers" ON patient_transfers;
CREATE POLICY "anon_select_patient_transfers" ON patient_transfers FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_patient_transfers" ON patient_transfers;
CREATE POLICY "anon_insert_patient_transfers" ON patient_transfers FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_patient_transfers" ON patient_transfers;
CREATE POLICY "anon_update_patient_transfers" ON patient_transfers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_patient_transfers" ON patient_transfers;
CREATE POLICY "anon_delete_patient_transfers" ON patient_transfers FOR DELETE
  TO anon, authenticated USING (true);

-- Step 3: huddle_sessions table
CREATE TABLE IF NOT EXISTS huddle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  title text NOT NULL,
  session_type text NOT NULL DEFAULT 'huddle' CHECK (session_type IN ('huddle', 'handover', 'cme', 'mentorship')),
  host_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  host_name text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed')),
  join_link text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE huddle_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_huddle_sessions" ON huddle_sessions;
CREATE POLICY "anon_select_huddle_sessions" ON huddle_sessions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_huddle_sessions" ON huddle_sessions;
CREATE POLICY "anon_insert_huddle_sessions" ON huddle_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_huddle_sessions" ON huddle_sessions;
CREATE POLICY "anon_update_huddle_sessions" ON huddle_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_huddle_sessions" ON huddle_sessions;
CREATE POLICY "anon_delete_huddle_sessions" ON huddle_sessions FOR DELETE
  TO anon, authenticated USING (true);

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS idx_patient_transfers_hospital ON patient_transfers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_patient ON patient_transfers(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_status ON patient_transfers(status);
CREATE INDEX IF NOT EXISTS idx_huddle_sessions_hospital ON huddle_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_huddle_sessions_status ON huddle_sessions(status);

-- Step 5: Enable realtime (use DO block to handle "already exists" errors)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE patient_transfers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE huddle_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 6: Seed data — assign doctors to hospitals and create hospital_staff profile
DO $$ DECLARE
  aga_khan_id uuid;
  kairuki_id uuid;
  drrh_id uuid;
  doc_count int;
BEGIN
  SELECT id INTO aga_khan_id FROM hospitals WHERE name ILIKE '%aga khan%' LIMIT 1;
  SELECT id INTO kairuki_id FROM hospitals WHERE name ILIKE '%kairuki%' LIMIT 1;
  SELECT id INTO drrh_id FROM hospitals WHERE name ILIKE '%drrh%' OR name ILIKE '%regional referral%' LIMIT 1;

  IF aga_khan_id IS NOT NULL THEN
    UPDATE profiles SET hospital_id = aga_khan_id
    WHERE id IN (SELECT id FROM profiles WHERE role = 'doctor' AND hospital_id IS NULL LIMIT 2);
  END IF;
  IF kairuki_id IS NOT NULL THEN
    UPDATE profiles SET hospital_id = kairuki_id
    WHERE id IN (SELECT id FROM profiles WHERE role = 'doctor' AND hospital_id IS NULL LIMIT 1);
  END IF;
  IF drrh_id IS NOT NULL THEN
    UPDATE profiles SET hospital_id = drrh_id
    WHERE id IN (SELECT id FROM profiles WHERE role = 'doctor' AND hospital_id IS NULL LIMIT 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'hospital_staff') THEN
    INSERT INTO profiles (name, role, phone, location)
    VALUES ('Hospital Admin', 'hospital_staff', '+255700000000', 'Dar es Salaam');
  END IF;
END $$;
