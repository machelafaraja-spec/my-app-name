/*
# AfyaApp Digital Health Platform Schema

1. New Tables
- `profiles`: User profiles with role (patient/doctor/pharmacist/lab_tech), name, phone, location, DOB, gender, blood type.
- `prescriptions`: Digital prescriptions with ICD-10 codes, QR verification data, diagnosis, notes, status.
- `prescription_medications`: Medications within a prescription (name, dosage, frequency, duration, quantity, instructions).
- `pharmacy_orders`: Pharmacy fulfillment orders (pickup/delivery, status, pickup token, delivery address, price).
- `lab_tests`: Lab test orders with status tracking (ordered/in_progress/completed), results, notes.
- `health_records`: EHR timeline events (prescription/lab_test/visit/vaccination) for universal patient record.
- `chat_messages`: Swahili AI health assistant conversation messages.

2. Security
- RLS enabled on all tables.
- All tables use `TO anon, authenticated` policies (no-auth app, role switching via UI navigation).
- Full CRUD access for anon + authenticated since this is a single-tenant demo platform.

3. Important Notes
- This is a no-auth app: users switch roles via UI navigation, so anon-key access is required.
- All foreign keys use ON DELETE CASCADE to maintain referential integrity.
- Indexes added on frequently-queried columns (patient_id, prescription_id, status).
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'doctor', 'pharmacist', 'lab_tech')),
  phone text,
  location text,
  date_of_birth date,
  gender text,
  blood_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  doctor_name text NOT NULL,
  icd10_code text NOT NULL,
  icd10_description text NOT NULL,
  diagnosis text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'filled', 'cancelled')),
  qr_code_data text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_prescriptions" ON prescriptions;
CREATE POLICY "anon_select_prescriptions" ON prescriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_prescriptions" ON prescriptions;
CREATE POLICY "anon_insert_prescriptions" ON prescriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_prescriptions" ON prescriptions;
CREATE POLICY "anon_update_prescriptions" ON prescriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_prescriptions" ON prescriptions;
CREATE POLICY "anon_delete_prescriptions" ON prescriptions FOR DELETE
  TO anon, authenticated USING (true);

-- Prescription medications table
CREATE TABLE IF NOT EXISTS prescription_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  instructions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescription_medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_medications" ON prescription_medications;
CREATE POLICY "anon_select_medications" ON prescription_medications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_medications" ON prescription_medications;
CREATE POLICY "anon_insert_medications" ON prescription_medications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_medications" ON prescription_medications;
CREATE POLICY "anon_update_medications" ON prescription_medications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_medications" ON prescription_medications;
CREATE POLICY "anon_delete_medications" ON prescription_medications FOR DELETE
  TO anon, authenticated USING (true);

-- Pharmacy orders table
CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  pharmacist_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  pharmacist_name text,
  fulfillment_type text NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'picked_up', 'cancelled')),
  pickup_token text,
  delivery_address text,
  total_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pharmacy_orders" ON pharmacy_orders;
CREATE POLICY "anon_select_pharmacy_orders" ON pharmacy_orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pharmacy_orders" ON pharmacy_orders;
CREATE POLICY "anon_insert_pharmacy_orders" ON pharmacy_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pharmacy_orders" ON pharmacy_orders;
CREATE POLICY "anon_update_pharmacy_orders" ON pharmacy_orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pharmacy_orders" ON pharmacy_orders;
CREATE POLICY "anon_delete_pharmacy_orders" ON pharmacy_orders FOR DELETE
  TO anon, authenticated USING (true);

-- Lab tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  doctor_name text NOT NULL,
  test_name text NOT NULL,
  test_category text NOT NULL,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'in_progress', 'completed')),
  results text,
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lab_tests" ON lab_tests;
CREATE POLICY "anon_select_lab_tests" ON lab_tests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_lab_tests" ON lab_tests;
CREATE POLICY "anon_insert_lab_tests" ON lab_tests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_lab_tests" ON lab_tests;
CREATE POLICY "anon_update_lab_tests" ON lab_tests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_lab_tests" ON lab_tests;
CREATE POLICY "anon_delete_lab_tests" ON lab_tests FOR DELETE
  TO anon, authenticated USING (true);

-- Health records table (EHR timeline)
CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('prescription', 'lab_test', 'visit', 'vaccination', 'diagnosis')),
  title text NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_health_records" ON health_records;
CREATE POLICY "anon_select_health_records" ON health_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_health_records" ON health_records;
CREATE POLICY "anon_insert_health_records" ON health_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_health_records" ON health_records;
CREATE POLICY "anon_update_health_records" ON health_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_health_records" ON health_records;
CREATE POLICY "anon_delete_health_records" ON health_records FOR DELETE
  TO anon, authenticated USING (true);

-- Chat messages table (Swahili AI assistant)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  message text NOT NULL,
  language text NOT NULL DEFAULT 'sw',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat" ON chat_messages;
CREATE POLICY "anon_update_chat" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_medications_prescription_id ON prescription_medications(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient_id ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_prescription_id ON pharmacy_orders(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status);
CREATE INDEX IF NOT EXISTS idx_health_records_patient_id ON health_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_id ON chat_messages(session_id);
