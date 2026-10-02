/*
# AfyaApp Telehealth & AI Scribe Schema

New Tables:
- consultations: Telehealth consultation sessions (video/voice/chat) with SOAP notes and AI transcript
- consultation_messages: Real-time 1-on-1 chat messages between doctor and patient with file/photo support

Security: RLS enabled, anon+authenticated full CRUD (demo platform, no-auth role switching).
*/

-- =====================
-- consultations table
-- =====================
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  doctor_name text NOT NULL,
  channel text NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat', 'voice', 'video')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ringing', 'active', 'completed', 'cancelled', 'missed')),
  reason text,
  soap_subjective text,
  soap_objective text,
  soap_assessment text,
  soap_plan text,
  ai_transcript text,
  ai_extracted_symptoms text,
  ai_extracted_duration text,
  ai_extracted_history text,
  ai_generated boolean DEFAULT false,
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_consultations" ON consultations;
CREATE POLICY "anon_select_consultations" ON consultations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_consultations" ON consultations;
CREATE POLICY "anon_insert_consultations" ON consultations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_consultations" ON consultations;
CREATE POLICY "anon_update_consultations" ON consultations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_consultations" ON consultations;
CREATE POLICY "anon_delete_consultations" ON consultations FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- consultation_messages table
-- =====================
CREATE TABLE IF NOT EXISTS consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('patient', 'doctor')),
  message text,
  attachment_url text,
  attachment_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_convo_msgs" ON consultation_messages;
CREATE POLICY "anon_select_convo_msgs" ON consultation_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_convo_msgs" ON consultation_messages;
CREATE POLICY "anon_insert_convo_msgs" ON consultation_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_convo_msgs" ON consultation_messages;
CREATE POLICY "anon_update_convo_msgs" ON consultation_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_convo_msgs" ON consultation_messages;
CREATE POLICY "anon_delete_convo_msgs" ON consultation_messages FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_convo_msgs_consultation ON consultation_messages(consultation_id);
