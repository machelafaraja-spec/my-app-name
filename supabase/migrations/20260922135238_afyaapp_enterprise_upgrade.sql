/*
# AfyaApp Enterprise Upgrade Schema

New Tables:
- hospitals: Hospital registration with GPS, verification status, levels
- hospital_units: Dynamic units per hospital (WHO/Tanzania standards + custom)
- providers: Healthcare provider verification (NIDA, council reg, license, blue tick)
- consultations: Tele-consultation records with SOAP notes
- notifications: Dual-channel (app + SMS) notification system
- ambulance_requests: GPS-based ambulance dispatch
- pharmacy_inventory: Real-time medication stock per pharmacy
- allergies: Patient allergy records for anti-allergy alerts

Extended Tables:
- profiles: Added hospital_id, language, allergies_summary, nida_number, council_reg_no, license_no, verification_status, specialization
- prescriptions: Added digital_signature, hospital_id, consultation_id
- lab_tests: Added turnaround_time, sample_collected_at, sms_sent
- pharmacy_orders: Added hospital_id, pharmacy_inventory matched

Security: RLS enabled on all new tables with anon+authenticated full CRUD (demo platform).
*/

-- =====================
-- EXTEND profiles table
-- =====================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hospital_id uuid;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'sw';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies_summary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nida_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS council_reg_no text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_no text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'approved';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

-- =====================
-- hospitals table
-- =====================
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_no text NOT NULL,
  level text NOT NULL CHECK (level IN ('primary', 'secondary', 'tertiary')),
  email text,
  phone text,
  physical_address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'rejected')),
  admin_name text,
  admin_phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hospitals" ON hospitals;
CREATE POLICY "anon_select_hospitals" ON hospitals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hospitals" ON hospitals;
CREATE POLICY "anon_insert_hospitals" ON hospitals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hospitals" ON hospitals;
CREATE POLICY "anon_update_hospitals" ON hospitals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hospitals" ON hospitals;
CREATE POLICY "anon_delete_hospitals" ON hospitals FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- hospital_units table
-- =====================
CREATE TABLE IF NOT EXISTS hospital_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospital_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_units" ON hospital_units;
CREATE POLICY "anon_select_units" ON hospital_units FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_units" ON hospital_units;
CREATE POLICY "anon_insert_units" ON hospital_units FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_units" ON hospital_units;
CREATE POLICY "anon_update_units" ON hospital_units FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_units" ON hospital_units;
CREATE POLICY "anon_delete_units" ON hospital_units FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- providers table
-- =====================
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'pharmacist', 'counselor', 'lab_tech')),
  nida_number text,
  council_reg_no text,
  license_no text,
  specialization text,
  verification_status text NOT NULL DEFAULT 'pending_approval' CHECK (verification_status IN ('pending_approval', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_providers" ON providers;
CREATE POLICY "anon_select_providers" ON providers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_providers" ON providers;
CREATE POLICY "anon_insert_providers" ON providers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_providers" ON providers;
CREATE POLICY "anon_update_providers" ON providers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_providers" ON providers;
CREATE POLICY "anon_delete_providers" ON providers FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- consultations table (tele-consultation + SOAP notes)
-- =====================
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  doctor_name text NOT NULL,
  type text NOT NULL DEFAULT 'in_person' CHECK (type IN ('in_person', 'telemedicine')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  soap_subjective text,
  soap_objective text,
  soap_assessment text,
  soap_plan text,
  ai_transcript text,
  ai_generated boolean DEFAULT false,
  prescription_id uuid,
  scheduled_at timestamptz DEFAULT now(),
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
-- notifications table (dual-channel: app + SMS)
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_name text NOT NULL,
  target_phone text,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (type IN ('lab_result', 'prescription', 'appointment', 'ambulance', 'verification', 'order', 'general')),
  channel text NOT NULL DEFAULT 'app' CHECK (channel IN ('app', 'sms', 'both')),
  sms_sent boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- ambulance_requests table (GPS-based dispatch)
-- =====================
CREATE TABLE IF NOT EXISTS ambulance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  pickup_address text NOT NULL,
  pickup_latitude numeric(10,7),
  pickup_longitude numeric(10,7),
  destination_hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  destination_name text,
  reason text,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'critical')),
  status text NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'en_route', 'arrived', 'transporting', 'completed', 'cancelled')),
  eta_minutes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ambulance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ambulance" ON ambulance_requests;
CREATE POLICY "anon_select_ambulance" ON ambulance_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ambulance" ON ambulance_requests;
CREATE POLICY "anon_insert_ambulance" ON ambulance_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ambulance" ON ambulance_requests;
CREATE POLICY "anon_update_ambulance" ON ambulance_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ambulance" ON ambulance_requests;
CREATE POLICY "anon_delete_ambulance" ON ambulance_requests FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- pharmacy_inventory table
-- =====================
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  expiry_date date,
  batch_number text,
  is_in_stock boolean DEFAULT true,
  last_restocked timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory" ON pharmacy_inventory;
CREATE POLICY "anon_select_inventory" ON pharmacy_inventory FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory" ON pharmacy_inventory;
CREATE POLICY "anon_insert_inventory" ON pharmacy_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory" ON pharmacy_inventory;
CREATE POLICY "anon_update_inventory" ON pharmacy_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory" ON pharmacy_inventory;
CREATE POLICY "anon_delete_inventory" ON pharmacy_inventory FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- allergies table
-- =====================
CREATE TABLE IF NOT EXISTS allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_allergies" ON allergies;
CREATE POLICY "anon_select_allergies" ON allergies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_allergies" ON allergies;
CREATE POLICY "anon_insert_allergies" ON allergies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_allergies" ON allergies;
CREATE POLICY "anon_update_allergies" ON allergies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_allergies" ON allergies;
CREATE POLICY "anon_delete_allergies" ON allergies FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- EXTEND prescriptions table
-- =====================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS digital_signature text;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS hospital_id uuid;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS consultation_id uuid;

-- =====================
-- EXTEND lab_tests table
-- =====================
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS turnaround_time text;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS sample_collected_at timestamptz;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS sms_sent boolean DEFAULT false;

-- =====================
-- EXTEND pharmacy_orders table
-- =====================
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS hospital_id uuid;

-- =====================
-- Indexes
-- =====================
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);
CREATE INDEX IF NOT EXISTS idx_hospital_units_hospital ON hospital_units(hospital_id);
CREATE INDEX IF NOT EXISTS idx_providers_hospital ON providers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_providers_verification ON providers(verification_status);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_patient ON ambulance_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_status ON ambulance_requests(status);
CREATE INDEX IF NOT EXISTS idx_inventory_pharmacist ON pharmacy_inventory(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
