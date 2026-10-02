/*
# EHR Patient ID System & Comprehensive Health History

## Overview
This migration adds a unique Patient ID system (AFYA-2026-XXXX) linked to NIDA or phone number,
plus comprehensive EHR modules: allergies, immunizations, clinical notes, chronic conditions,
and a secure access request mechanism for doctors/hospital staff.

## 1. New Columns on `profiles`
- `patient_id_number` (text, unique) — e.g., AFYA-2026-XXXX, auto-generated for patient role
- `nida_number` (text) — National ID number (NIDA) for identity verification
- `id_verified` (boolean, default false) — whether NIDA or OTP phone verification is complete
- `otp_verified` (boolean, default false) — whether phone OTP verification passed

## 2. New Tables
- `allergies` — Known allergies & drug reactions with severity (high-priority alert badge)
  - patient_id, allergen, reaction_type, severity, notes
- `immunizations` — Vaccination & immunization records
  - patient_id, vaccine_name, dose_number, date_administered, next_due, administered_by, notes
- `clinical_notes` — Doctor's clinical notes & consultation records
  - patient_id, doctor_id, doctor_name, note_type, content, consultation_id (optional)
- `chronic_conditions` — Chronic conditions & past illnesses (diagnoses history)
  - patient_id, condition_name, icd10_code, diagnosed_date, status, notes
- `ehr_access_requests` — Secure access request records for doctors viewing patient EHR
  - patient_id, requester_id, requester_name, requester_role, otp_code, status, expires_at, granted_at

## 3. Security
- RLS enabled on all new tables with `TO anon, authenticated` (no-auth app, shared data model).
- Full CRUD for anon + authenticated on all new tables (consistent with existing schema).

## 4. Important Notes
- Patient ID is generated via a trigger function `generate_patient_id()` that fires on insert
  when role='patient' and patient_id_number is null.
- The format is AFYA-YYYY-XXXX where YYYY is the current year and XXXX is a random alphanumeric.
- All tables use ON DELETE CASCADE for patient_id foreign keys.
- Indexes added on patient_id columns and frequently queried fields.
*/

-- ── Add columns to profiles ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS patient_id_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nida_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_verified boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_patient_id_number ON profiles(patient_id_number) WHERE patient_id_number IS NOT NULL;

-- ── Patient ID generation function ──
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'patient' AND (NEW.patient_id_number IS NULL OR NEW.patient_id_number = '') THEN
    NEW.patient_id_number := 'AFYA-' || EXTRACT(YEAR FROM now())::text || '-' ||
      substr(translate(gen_random_uuid()::text, '-', ''), 1, 4)::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_patient_id ON profiles;
CREATE TRIGGER trg_generate_patient_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_patient_id();

-- ── Allergies table ──
CREATE TABLE IF NOT EXISTS allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  reaction_type text NOT NULL DEFAULT 'drug',
  severity text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_allergies" ON allergies;
CREATE POLICY "anon_select_allergies" ON allergies FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_allergies" ON allergies;
CREATE POLICY "anon_insert_allergies" ON allergies FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_allergies" ON allergies;
CREATE POLICY "anon_update_allergies" ON allergies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_allergies" ON allergies;
CREATE POLICY "anon_delete_allergies" ON allergies FOR DELETE
  TO anon, authenticated USING (true);

-- ── Immunizations table ──
CREATE TABLE IF NOT EXISTS immunizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  dose_number integer DEFAULT 1,
  date_administered date NOT NULL DEFAULT CURRENT_DATE,
  next_due date,
  administered_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE immunizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_immunizations" ON immunizations;
CREATE POLICY "anon_select_immunizations" ON immunizations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_immunizations" ON immunizations;
CREATE POLICY "anon_insert_immunizations" ON immunizations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_immunizations" ON immunizations;
CREATE POLICY "anon_update_immunizations" ON immunizations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_immunizations" ON immunizations;
CREATE POLICY "anon_delete_immunizations" ON immunizations FOR DELETE
  TO anon, authenticated USING (true);

-- ── Clinical notes table ──
CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_name text NOT NULL,
  note_type text NOT NULL DEFAULT 'consultation' CHECK (note_type IN ('consultation', 'diagnosis', 'procedure', 'follow-up', 'general')),
  content text NOT NULL,
  consultation_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clinical_notes" ON clinical_notes;
CREATE POLICY "anon_select_clinical_notes" ON clinical_notes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clinical_notes" ON clinical_notes;
CREATE POLICY "anon_insert_clinical_notes" ON clinical_notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clinical_notes" ON clinical_notes;
CREATE POLICY "anon_update_clinical_notes" ON clinical_notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clinical_notes" ON clinical_notes;
CREATE POLICY "anon_delete_clinical_notes" ON clinical_notes FOR DELETE
  TO anon, authenticated USING (true);

-- ── Chronic conditions table ──
CREATE TABLE IF NOT EXISTS chronic_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  condition_name text NOT NULL,
  icd10_code text,
  diagnosed_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'managed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chronic_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chronic_conditions" ON chronic_conditions;
CREATE POLICY "anon_select_chronic_conditions" ON chronic_conditions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chronic_conditions" ON chronic_conditions;
CREATE POLICY "anon_insert_chronic_conditions" ON chronic_conditions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chronic_conditions" ON chronic_conditions;
CREATE POLICY "anon_update_chronic_conditions" ON chronic_conditions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chronic_conditions" ON chronic_conditions;
CREATE POLICY "anon_delete_chronic_conditions" ON chronic_conditions FOR DELETE
  TO anon, authenticated USING (true);

-- ── EHR access requests table ──
CREATE TABLE IF NOT EXISTS ehr_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  requester_role text NOT NULL DEFAULT 'doctor',
  otp_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'denied', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  granted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ehr_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ehr_access" ON ehr_access_requests;
CREATE POLICY "anon_select_ehr_access" ON ehr_access_requests FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ehr_access" ON ehr_access_requests;
CREATE POLICY "anon_insert_ehr_access" ON ehr_access_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ehr_access" ON ehr_access_requests;
CREATE POLICY "anon_update_ehr_access" ON ehr_access_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ehr_access" ON ehr_access_requests;
CREATE POLICY "anon_delete_ehr_access" ON ehr_access_requests FOR DELETE
  TO anon, authenticated USING (true);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_patient_id ON immunizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor_id ON clinical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_chronic_conditions_patient_id ON chronic_conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ehr_access_patient_id ON ehr_access_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_ehr_access_requester_id ON ehr_access_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_ehr_access_status ON ehr_access_requests(status);

-- ── Backfill patient IDs for existing patient profiles ──
DO $$
DECLARE
  p RECORD;
  new_id text;
BEGIN
  FOR p IN SELECT id FROM profiles WHERE role = 'patient' AND (patient_id_number IS NULL OR patient_id_number = '') LOOP
    new_id := 'AFYA-' || EXTRACT(YEAR FROM now())::text || '-' ||
      substr(translate(gen_random_uuid()::text, '-', ''), 1, 4);
    UPDATE profiles SET patient_id_number = new_id WHERE id = p.id;
  END LOOP;
END $$;
