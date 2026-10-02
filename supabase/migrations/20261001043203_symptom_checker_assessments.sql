/*
# AI Symptom Checker & Health Triage

## Overview
Stores symptom checker assessment sessions for patients, including the conversational
flow, triage result, recommended actions, and a pre-consultation clinical summary
that can be shared with doctors.

## 1. New Table: symptom_checker_assessments
- profile_id (uuid FK to profiles)
- session_id (text, unique per assessment session)
- symptoms (text[], list of identified symptoms)
- primary_symptom (text, main complaint)
- severity (integer 1-10, patient-reported)
- duration (text, e.g. "2 days", "1 week")
- associated_symptoms (text[], secondary symptoms identified)
- pre_existing_conditions (text[], from EHR at time of assessment)
- triage_level (text: 'high' | 'moderate' | 'low')
- red_flag_detected (boolean, true if emergency symptoms triggered)
- red_flag_reason (text, what triggered the red flag)
- recommended_actions (jsonb, structured recommendations)
- clinical_summary (text, auto-generated pre-consultation summary for doctors)
- suggested_lab_tests (text[], lab tests recommended based on symptoms)
- language (text, 'sw' or 'en')
- status (text: 'active' | 'completed' | 'shared_to_doctor')
- created_at, completed_at

## 2. Security
- RLS enabled with TO anon, authenticated (no-auth app, shared data model)
- Full CRUD for anon + authenticated, consistent with existing schema

## 3. Important Notes
- clinical_summary is generated client-side and saved here so doctors can access it
- recommended_actions is jsonb for flexible structured data
- Indexes on profile_id and session_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS symptom_checker_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  symptoms text[] NOT NULL DEFAULT '{}',
  primary_symptom text NOT NULL DEFAULT '',
  severity integer DEFAULT 1 CHECK (severity >= 1 AND severity <= 10),
  duration text,
  associated_symptoms text[] NOT NULL DEFAULT '{}',
  pre_existing_conditions text[] NOT NULL DEFAULT '{}',
  triage_level text NOT NULL DEFAULT 'low' CHECK (triage_level IN ('high', 'moderate', 'low')),
  red_flag_detected boolean NOT NULL DEFAULT false,
  red_flag_reason text,
  recommended_actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  clinical_summary text,
  suggested_lab_tests text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'sw',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'shared_to_doctor')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE symptom_checker_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sca" ON symptom_checker_assessments;
CREATE POLICY "anon_select_sca" ON symptom_checker_assessments FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sca" ON symptom_checker_assessments;
CREATE POLICY "anon_insert_sca" ON symptom_checker_assessments FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sca" ON symptom_checker_assessments;
CREATE POLICY "anon_update_sca" ON symptom_checker_assessments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sca" ON symptom_checker_assessments;
CREATE POLICY "anon_delete_sca" ON symptom_checker_assessments FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sca_profile_id ON symptom_checker_assessments(profile_id);
CREATE INDEX IF NOT EXISTS idx_sca_session_id ON symptom_checker_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_sca_triage_level ON symptom_checker_assessments(triage_level);
CREATE INDEX IF NOT EXISTS idx_sca_created_at ON symptom_checker_assessments(created_at DESC);
