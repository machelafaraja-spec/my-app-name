export type Role = 'patient' | 'doctor' | 'pharmacist' | 'lab_tech' | 'hospital_staff';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  location: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  specialty: string | null;
  consultation_fee: number | null;
  is_online: boolean | null;
  hospital_id: string | null;
  patient_id_number: string | null;
  nida_number: string | null;
  id_verified: boolean | null;
  otp_verified: boolean | null;
  created_at: string;
}

export interface PatientTransfer {
  id: string;
  patient_id: string | null;
  patient_name: string;
  hospital_id: string;
  from_unit: string | null;
  to_unit: string;
  transfer_reason: string | null;
  attending_staff_id: string | null;
  attending_staff_name: string | null;
  status: 'active' | 'transferred' | 'discharged';
  admitted_at: string;
  discharged_at: string | null;
  created_at: string;
}

export interface HuddleSession {
  id: string;
  hospital_id: string;
  title: string;
  session_type: 'huddle' | 'handover' | 'cme' | 'mentorship';
  host_id: string | null;
  host_name: string | null;
  status: 'scheduled' | 'active' | 'completed';
  join_link: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  patient_name: string;
  doctor_name: string;
  icd10_code: string;
  icd10_description: string;
  diagnosis: string;
  notes: string | null;
  status: 'active' | 'filled' | 'cancelled';
  qr_code_data: string | null;
  created_at: string;
}

export interface PrescriptionMedication {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  created_at: string;
}

export interface PharmacyOrder {
  id: string;
  prescription_id: string | null;
  patient_id: string | null;
  pharmacist_id: string | null;
  patient_name: string;
  pharmacist_name: string | null;
  fulfillment_type: 'pickup' | 'delivery';
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'picked_up' | 'cancelled';
  pickup_token: string | null;
  delivery_address: string | null;
  total_price: number | null;
  created_at: string;
}

export interface LabTest {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  patient_name: string;
  doctor_name: string;
  test_name: string;
  test_category: string;
  status: 'ordered' | 'in_progress' | 'completed';
  results: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  record_type: 'prescription' | 'lab_test' | 'visit' | 'vaccination' | 'diagnosis';
  title: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  message: string;
  language: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  patient_name: string;
  doctor_name: string;
  channel: 'chat' | 'voice' | 'video';
  status: 'scheduled' | 'ringing' | 'active' | 'completed' | 'cancelled' | 'missed';
  reason: string | null;
  soap_subjective: string | null;
  soap_objective: string | null;
  soap_assessment: string | null;
  soap_plan: string | null;
  ai_transcript: string | null;
  ai_extracted_symptoms: string | null;
  ai_extracted_duration: string | null;
  ai_extracted_history: string | null;
  ai_generated: boolean | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ConsultationMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'patient' | 'doctor';
  message: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  registration_no: string;
  level: 'primary' | 'secondary' | 'tertiary';
  email: string | null;
  phone: string | null;
  physical_address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending_verification' | 'verified' | 'rejected';
  admin_name: string | null;
  admin_phone: string | null;
  created_at: string;
}

export interface HospitalUnit {
  id: string;
  hospital_id: string;
  name: string;
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CallRoom {
  id: string;
  consultation_id: string;
  room_id: string;
  provider: 'agora' | 'twilio' | 'local';
  status: 'created' | 'active' | 'ended';
  caller_token: string | null;
  callee_token: string | null;
  caller_joined: boolean;
  callee_joined: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface PushToken {
  id: string;
  profile_id: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  is_active: boolean;
  created_at: string;
}

export interface AmbulanceRequest {
  id: string;
  patient_id: string | null;
  patient_name: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_hospital_id: string | null;
  destination_name: string | null;
  reason: string | null;
  urgency: 'normal' | 'urgent' | 'critical';
  status: 'dispatched' | 'en_route' | 'arrived' | 'transporting' | 'completed' | 'cancelled';
  eta_minutes: number | null;
  created_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  reaction_type: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  notes: string | null;
  created_at: string;
}

export interface Immunization {
  id: string;
  patient_id: string;
  vaccine_name: string;
  dose_number: number;
  date_administered: string;
  next_due: string | null;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ClinicalNote {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  doctor_name: string;
  note_type: 'consultation' | 'diagnosis' | 'procedure' | 'follow-up' | 'general';
  content: string;
  consultation_id: string | null;
  created_at: string;
}

export interface ChronicCondition {
  id: string;
  patient_id: string;
  condition_name: string;
  icd10_code: string | null;
  diagnosed_date: string | null;
  status: 'active' | 'resolved' | 'managed';
  notes: string | null;
  created_at: string;
}

export interface EhrAccessRequest {
  id: string;
  patient_id: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  otp_code: string;
  status: 'pending' | 'granted' | 'denied' | 'expired';
  expires_at: string;
  granted_at: string | null;
  created_at: string;
}

export interface HealthSavingsWallet {
  id: string;
  profile_id: string;
  balance: number;
  total_saved: number;
  total_spent: number;
  savings_goal: number | null;
  goal_label: string | null;
  auto_save_enabled: boolean;
  auto_save_amount: number | null;
  auto_save_day: number;
  created_at: string;
  updated_at: string;
}

export interface HealthSavingsTransaction {
  id: string;
  wallet_id: string;
  profile_id: string;
  type: 'deposit' | 'deduction' | 'goal_set' | 'goal_update';
  amount: number;
  channel: string;
  description: string;
  reference_id: string | null;
  balance_after: number;
  transaction_id: string | null;
  created_at: string;
}

export interface SymptomCheckerAssessment {
  id: string;
  profile_id: string;
  session_id: string;
  symptoms: string[];
  primary_symptom: string;
  severity: number;
  duration: string | null;
  associated_symptoms: string[];
  pre_existing_conditions: string[];
  triage_level: 'high' | 'moderate' | 'low';
  red_flag_detected: boolean;
  red_flag_reason: string | null;
  recommended_actions: Record<string, unknown>;
  clinical_summary: string | null;
  suggested_lab_tests: string[];
  language: string;
  status: 'active' | 'completed' | 'shared_to_doctor';
  created_at: string;
  completed_at: string | null;
}
