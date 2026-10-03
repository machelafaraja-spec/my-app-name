import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Pill, FlaskConical, Users, Search, Plus, Trash2,
  Stethoscope, QrCode, CheckCircle2, Clock, User, Phone, PhoneOff, MapPin,
  Video, Mic, Sparkles, MessageSquare, ClipboardList, Shield, Lock,
  ChevronRight, ChevronLeft, Activity, Heart, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Prescription, PrescriptionMedication, LabTest, Consultation } from '@/types';
import { Card, StatCard, Badge, Spinner, EmptyState, Modal, SectionHeader } from './ui';
import { PrescriptionQR, PrescriptionStatusBadge } from './QRComponents';
import { TelehealthCall } from './TelehealthCall';
import { AIClinicalScribe } from './AIClinicalScribe';
import { DoctorChat } from './DoctorChat';
import { PatientEHR } from './PatientEHR';
import { EhrAccessRequestFlow } from './EhrAccessRequest';
import { ICD10_CODES, COMMON_LAB_TESTS, COMMON_MEDICATIONS, DOSAGES, FREQUENCIES, DURATIONS } from '@/lib/constants';
import { useLang } from '@/lib/i18n';

type Tab = 'overview' | 'prescriptions' | 'create' | 'labs' | 'patients' | 'telehealth' | 'scribe' | 'ehr';

interface MedForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export function DoctorView({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<Record<string, PrescriptionMedication[]>>({});
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [icdSearch, setIcdSearch] = useState('');
  const [selectedIcd, setSelectedIcd] = useState<typeof ICD10_CODES[0] | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medForms, setMedForms] = useState<MedForm[]>([{ medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' }]);
  const [labTestName, setLabTestName] = useState('');
  const [labTestCategory, setLabTestCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdRx, setCreatedRx] = useState<Prescription | null>(null);

  // Telehealth state
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [callMode, setCallMode] = useState<'none' | 'voice' | 'video'>('none');
  const [chatConsultation, setChatConsultation] = useState<Consultation | null>(null);
  const [newConsultationPatient, setNewConsultationPatient] = useState<Profile | null>(null);
  const [consultationReason, setConsultationReason] = useState('');
  const [incomingCall, setIncomingCall] = useState<Consultation | null>(null);
  const [launchScribe, setLaunchScribe] = useState(false);

  // EHR state
  const [ehrPatient, setEhrPatient] = useState<Profile | null>(null);
  const [ehrAccessGranted, setEhrAccessGranted] = useState(false);
  const [patientLookupQuery, setPatientLookupQuery] = useState('');
  const [patientLookupResults, setPatientLookupResults] = useState<Profile[]>([]);
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [pendingEhrPatient, setPendingEhrPatient] = useState<Profile | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rxRes, labsRes, patientsRes, consultsRes] = await Promise.all([
      supabase.from('prescriptions').select('*').eq('doctor_name', profile.name).order('created_at', { ascending: false }),
      supabase.from('lab_tests').select('*').eq('doctor_name', profile.name).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'patient').order('name'),
      supabase.from('consultations').select('*').eq('doctor_name', profile.name).order('created_at', { ascending: false }),
    ]);

    const rxList = (rxRes.data as Prescription[]) || [];
    setPrescriptions(rxList);
    setLabTests((labsRes.data as LabTest[]) || []);
    setPatients((patientsRes.data as Profile[]) || []);
    setConsultations((consultsRes.data as Consultation[]) || []);

    const medPromises = rxList.map((rx) =>
      supabase.from('prescription_medications').select('*').eq('prescription_id', rx.id)
    );
    const medResults = await Promise.all(medPromises);
    const medMap: Record<string, PrescriptionMedication[]> = {};
    rxList.forEach((rx, i) => {
      medMap[rx.id] = (medResults[i].data as PrescriptionMedication[]) || [];
    });
    setMedications(medMap);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const { t } = useLang();

  // Real-time subscription for consultation status changes
  useEffect(() => {
    const channel = supabase
      .channel('doctor_consultations')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultations', filter: `doctor_id=eq.${profile.id}` },
        (payload) => {
          const newConsult = payload.new as Consultation;
          if (newConsult.status === 'ringing') {
            setIncomingCall(newConsult);
          }
          loadData();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `doctor_id=eq.${profile.id}` },
        (payload) => {
          const updated = payload.new as Consultation;
          if (updated.status === 'cancelled' || updated.status === 'missed') {
            setIncomingCall((prev) => prev && prev.id === updated.id ? null : prev);
          }
          loadData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.id, loadData]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone || '').includes(patientSearch)
  );

  const filteredIcd = ICD10_CODES.filter((c) =>
    c.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(icdSearch.toLowerCase())
  );

  function addMed() {
    setMedForms([...medForms, { medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' }]);
  }
  function removeMed(i: number) {
    setMedForms(medForms.filter((_, idx) => idx !== i));
  }
  function updateMed(i: number, field: keyof MedForm, value: string | number) {
    setMedForms(medForms.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  async function createPrescription() {
    if (!selectedPatient || !selectedIcd || !diagnosis) return;
    const validMeds = medForms.filter((m) => m.medication_name && m.dosage && m.frequency && m.duration);
    if (validMeds.length === 0) return;

    setCreating(true);
    const token = `AFYA-RX-${Date.now().toString(36).toUpperCase()}`;

    const { data: rxData } = await supabase.from('prescriptions').insert({
      patient_id: selectedPatient.id,
      doctor_id: profile.id,
      patient_name: selectedPatient.name,
      doctor_name: profile.name,
      icd10_code: selectedIcd.code,
      icd10_description: selectedIcd.description,
      diagnosis,
      notes: notes || null,
      status: 'active',
      qr_code_data: token,
    }).select('*').single();

    if (rxData) {
      const rx = rxData as Prescription;
      const medInserts = validMeds.map((m) => ({
        prescription_id: rx.id,
        medication_name: m.medication_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        quantity: m.quantity,
        instructions: m.instructions || null,
      }));
      await supabase.from('prescription_medications').insert(medInserts);

      await supabase.from('health_records').insert({
        patient_id: selectedPatient.id,
        record_type: 'prescription',
        title: `Dawa: ${selectedIcd.description}`,
        description: `${validMeds.length} dawa zimeagizwa na ${profile.name}`,
        reference_id: rx.id,
      });

      setCreatedRx(rx);
      setPrescriptions((prev) => [rx, ...prev]);
      setMedications((prev) => ({ ...prev, [rx.id]: medInserts as unknown as PrescriptionMedication[] }));

      setSelectedPatient(null);
      setSelectedIcd(null);
      setDiagnosis('');
      setNotes('');
      setMedForms([{ medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' }]);
      setTab('prescriptions');
    }
    setCreating(false);
  }

  async function startConsultation(patient: Profile, channel: 'chat' | 'voice' | 'video', reason?: string) {
    const { data } = await supabase.from('consultations').insert({
      patient_id: patient.id,
      doctor_id: profile.id,
      patient_name: patient.name,
      doctor_name: profile.name,
      channel,
      status: channel === 'chat' ? 'active' : 'ringing',
      reason: reason || null,
      started_at: channel !== 'chat' ? new Date().toISOString() : null,
    }).select('*').single();

    if (data) {
      const consult = data as Consultation;
      setConsultations((prev) => [consult, ...prev]);
      if (channel === 'chat') {
        setChatConsultation(consult);
        setTab('telehealth');
      } else {
        setActiveConsultation(consult);
        setCallMode(channel);
      }
    }
  }

  async function endCall() {
    if (activeConsultation) {
      await supabase.from('consultations').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', activeConsultation.id);
      setConsultations((prev) => prev.map((c) => c.id === activeConsultation.id ? { ...c, status: 'completed' } : c));
    }
    setActiveConsultation(null);
    setCallMode('none');
  }

  async function saveSOAP(soap: { subjective: string; objective: string; assessment: string; plan: string; transcript: string; symptoms: string; duration: string; history: string }) {
    if (activeConsultation) {
      await supabase.from('consultations').update({
        soap_subjective: soap.subjective,
        soap_objective: soap.objective,
        soap_assessment: soap.assessment,
        soap_plan: soap.plan,
        ai_transcript: soap.transcript,
        ai_extracted_symptoms: soap.symptoms,
        ai_extracted_duration: soap.duration,
        ai_extracted_history: soap.history,
        ai_generated: true,
      }).eq('id', activeConsultation.id);
      setConsultations((prev) => prev.map((c) => c.id === activeConsultation.id ? {
        ...c,
        soap_subjective: soap.subjective,
        soap_objective: soap.objective,
        soap_assessment: soap.assessment,
        soap_plan: soap.plan,
        ai_transcript: soap.transcript,
        ai_extracted_symptoms: soap.symptoms,
        ai_extracted_duration: soap.duration,
        ai_extracted_history: soap.history,
        ai_generated: true,
      } : c));
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Mwanzo', icon: Stethoscope },
    { id: 'ehr', label: 'EHR', icon: ClipboardList },
    { id: 'prescriptions', label: 'Dawa', icon: Pill },
    { id: 'create', label: 'Andika Dawa', icon: Plus },
    { id: 'labs', label: 'Vipimo', icon: FlaskConical },
    { id: 'patients', label: 'Wagonjwa', icon: Users },
    { id: 'telehealth', label: 'Telehealth', icon: Video },
    { id: 'scribe', label: 'AI Scribe', icon: Sparkles },
  ];

  // Incoming call alert overlay
  if (incomingCall && !(activeConsultation && callMode !== 'none')) {
    const consult = incomingCall;

    async function acceptCall(withScribe: boolean) {
      setIncomingCall(null);
      await supabase.from('consultations').update({
        status: 'active',
        started_at: new Date().toISOString(),
      }).eq('id', consult.id);
      setActiveConsultation(consult);
      setCallMode(consult.channel === 'chat' ? 'none' : (consult.channel as 'voice' | 'video'));
      if (withScribe) setLaunchScribe(true);
      loadData();
    }

    async function declineCall() {
      setIncomingCall(null);
      await supabase.from('consultations').update({
        status: 'missed',
        completed_at: new Date().toISOString(),
      }).eq('id', consult.id);
      loadData();
    }

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-5 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3 animate-pulse-soft">
              {incomingCall.channel === 'video' ? <Video size={28} className="text-white" /> : <Phone size={28} className="text-white" />}
            </div>
            <p className="text-white/80 text-sm font-semibold uppercase tracking-wide">{t('doctor.incoming.title')}</p>
            <h2 className="text-white text-xl font-bold mt-1">{incomingCall.patient_name}</h2>
            <p className="text-blue-200 text-sm mt-0.5">
              {incomingCall.channel === 'video' ? t('call.videoCall') : incomingCall.channel === 'voice' ? t('call.voiceCall') : t('call.chat')}
            </p>
          </div>

          {/* Reason */}
          {incomingCall.reason && (
            <div className="px-6 py-3 bg-slate-50 text-center">
              <p className="text-xs text-slate-400 uppercase font-semibold">{t('doctor.incoming.patient')}</p>
              <p className="text-sm text-slate-600 mt-0.5">{incomingCall.reason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="p-5 space-y-3">
            <button
              onClick={() => acceptCall(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:from-blue-700 hover:to-blue-800 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
            >
              <Sparkles size={18} />
              {t('doctor.incoming.withScribe')}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => acceptCall(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all active:scale-95"
              >
                <Phone size={18} />
                {t('doctor.incoming.accept')}
              </button>
              <button
                onClick={declineCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-100 text-red-600 font-bold hover:bg-red-200 transition-all active:scale-95"
              >
                <PhoneOff size={18} />
                {t('doctor.incoming.decline')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call overlay
  if (activeConsultation && callMode !== 'none') {
    return (
      <TelehealthCall
        consultation={{ ...activeConsultation, channel: callMode }}
        profile={profile}
        onEnd={endCall}
      />
    );
  }

  // AI Scribe panel after call (if launched)
  if (launchScribe && activeConsultation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Sparkles size={16} className="text-blue-500" />
            <span className="font-semibold">AI Clinical Scribe - {activeConsultation.patient_name}</span>
          </div>
          <button onClick={() => setLaunchScribe(false)} className="btn-ghost text-xs">Close</button>
        </div>
        <AIClinicalScribe consultation={activeConsultation} onSave={saveSOAP} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 bg-gradient-to-br from-secondary-600 to-secondary-800 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Stethoscope size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-sm text-secondary-100">Daktari - {profile.location || 'Tanzania'}</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-secondary-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20"><Spinner size={32} /></div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FileText} label="Dawa Zilizoandikwa" value={prescriptions.length} color="secondary" />
                <StatCard icon={Pill} label="Dawa Zinazotumika" value={prescriptions.filter(p => p.status === 'active').length} color="primary" />
                <StatCard icon={FlaskConical} label="Vipimo Vyeoagizwa" value={labTests.length} color="accent" />
                <StatCard icon={Video} label="Telehealth" value={consultations.filter(c => c.status === 'active' || c.status === 'ringing').length} color="success" />
              </div>
              <Card className="p-5">
                <SectionHeader title="Dawa za Karibuni" />
                {prescriptions.length === 0 ? (
                  <EmptyState icon={Pill} title="Hakuna dawa zilizoandikwa" />
                ) : (
                  <div className="space-y-2">
                    {prescriptions.slice(0, 5).map((rx) => (
                      <div key={rx.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary-600 flex items-center justify-center">
                          <Pill size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-slate-900">{rx.patient_name}</p>
                          <p className="text-xs text-slate-500">{rx.icd10_code} - {rx.icd10_description}</p>
                        </div>
                        <PrescriptionStatusBadge status={rx.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {consultations.length > 0 && (
                <Card className="p-5">
                  <SectionHeader title="Mazungumzo ya Karibuni" />
                  <div className="space-y-2">
                    {consultations.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="w-10 h-10 rounded-xl bg-success-100 text-success-600 flex items-center justify-center">
                          {c.channel === 'video' ? <Video size={18} /> : c.channel === 'voice' ? <Phone size={18} /> : <MessageSquare size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-slate-900">{c.patient_name}</p>
                          <p className="text-xs text-slate-500">{c.channel} - {c.reason || 'Hakuna sababu'}</p>
                        </div>
                        {c.status === 'active' && <Badge color="success" icon={Clock}>Inaendelea</Badge>}
                        {c.status === 'completed' && <Badge color="slate" icon={CheckCircle2}>Imekamilika</Badge>}
                        {c.status === 'ringing' && <Badge color="warning" icon={Phone}>Inapiga</Badge>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === 'ehr' && (
            <div className="space-y-4">
              {!ehrPatient ? (
                <>
                  <Card className="p-5">
                    <SectionHeader title="Tafuta Mgonjwa (Patient Lookup)" subtitle="Tafuta kwa Patient ID, NIDA, au Simu" />
                    <div className="relative mb-4">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={patientLookupQuery}
                        onChange={async (e) => {
                          setPatientLookupQuery(e.target.value);
                          const q = e.target.value.trim();
                          if (q.length < 2) { setPatientLookupResults([]); return; }
                          const { data } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('role', 'patient')
                            .or(`name.ilike.%${q}%,phone.ilike.%${q}%,patient_id_number.ilike.%${q}%,nida_number.ilike.%${q}%`)
                            .limit(10);
                          setPatientLookupResults((data as Profile[]) || []);
                        }}
                        placeholder="Mfano: AFYA-2026-XXXX, 07XX XXX XXX, au jina..."
                        className="input pl-10"
                      />
                    </div>
                    {patientLookupResults.length > 0 && (
                      <div className="space-y-2">
                        {patientLookupResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setPendingEhrPatient(p); setShowAccessRequest(true); }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left"
                          >
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                              {p.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                {p.patient_id_number && <span className="font-mono text-emerald-600">{p.patient_id_number}</span>}
                                {p.phone && <span className="flex items-center gap-1"><Phone size={10} />{p.phone}</span>}
                                {p.nida_number && <span>NIDA: {p.nida_number}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {p.id_verified && <Badge color="success" icon={Shield}>Imethibitishwa</Badge>}
                              <ChevronRight size={16} className="text-slate-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {patientLookupQuery.length >= 2 && patientLookupResults.length === 0 && (
                      <EmptyState icon={Search} title="Hakuna mgonjwa aliye patikana" description="Jaribu kutafuta kwa jina, ID, NIDA, au simu" />
                    )}
                  </Card>

                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <Lock size={18} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Kufuata HIPAA/PDPC: Ufikiaji wa historia ya afya unahitaji ridhaa ya mgonjwa kupitia OTP.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setEhrPatient(null); setEhrAccessGranted(false); }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-3 transition-colors"
                  >
                    <ChevronLeft size={18} /> Rudi kwenye Tafuta
                  </button>
                  <PatientEHR patient={ehrPatient} doctorName={profile.name} doctorId={profile.id} />
                </>
              )}
            </div>
          )}

          {tab === 'prescriptions' && (
            <div className="space-y-3">
              {prescriptions.length === 0 ? (
                <Card><EmptyState icon={Pill} title="Hakuna dawa" description="Andika dwa mpya kwa kubonyeza 'Andika Dawa'" /></Card>
              ) : (
                prescriptions.map((rx) => (
                  <Card key={rx.id} className="p-4" hover>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center">
                        <Pill size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{rx.patient_name}</p>
                            <p className="text-sm text-slate-500">{rx.icd10_description}</p>
                          </div>
                          <PrescriptionStatusBadge status={rx.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge color="secondary">{rx.icd10_code}</Badge>
                          <span className="text-xs text-slate-400">{(medications[rx.id] || []).length} dawa</span>
                          <span className="text-xs text-slate-400">{new Date(rx.created_at).toLocaleDateString('sw-TZ')}</span>
                        </div>
                        <button onClick={() => setSelectedRx(rx)} className="btn-ghost text-xs mt-2">
                          <QrCode size={14} /> Ona QR Code
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'create' && (
            <Card className="p-5">
              <SectionHeader title="Andika Dawa Mpya" subtitle="Chagua mgonjwa, ugonjwa, na dawa" />

              <div className="mb-4">
                <label className="label">Mgonjwa</label>
                {selectedPatient ? (
                  <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-200">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{selectedPatient.name}</p>
                      <p className="text-xs text-slate-500">{selectedPatient.phone} - {selectedPatient.location}</p>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} className="btn-ghost text-xs">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Tafuta mgonjwa kwa jina au simu..." className="input pl-9" />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredPatients.slice(0, 6).map((p) => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(''); }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.phone} - {p.location}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mb-4">
                <label className="label">Kodi ya ICD-10 ya Ugonjwa</label>
                {selectedIcd ? (
                  <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                    <Badge color="secondary">{selectedIcd.code}</Badge>
                    <span className="text-sm text-slate-700 flex-1">{selectedIcd.description}</span>
                    <button onClick={() => setSelectedIcd(null)} className="btn-ghost text-xs">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={icdSearch} onChange={(e) => setIcdSearch(e.target.value)}
                        placeholder="Tafuta kwa kodi au jina la ugonjwa..." className="input pl-9" />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredIcd.slice(0, 8).map((c) => (
                        <button key={c.code} onClick={() => { setSelectedIcd(c); setIcdSearch(''); }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                          <Badge color="secondary">{c.code}</Badge>
                          <span className="text-sm text-slate-700 flex-1">{c.description}</span>
                          <span className="text-xs text-slate-400">{c.category}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mb-4">
                <label className="label">Uchunguzi wa Ugonjwa (Diagnosis)</label>
                <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Eleza ugonjwa na dalili..." rows={2} className="input resize-none" />
              </div>

              <div className="mb-4">
                <label className="label">Maelezo ya Ziada (lahivyo)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Maelezo kwa mgonjwa na famasia..." rows={2} className="input resize-none" />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Dawa</label>
                  <button onClick={addMed} className="btn-ghost text-xs text-primary-600">
                    <Plus size={14} /> Ongeza Dawa
                  </button>
                </div>
                <div className="space-y-3">
                  {medForms.map((med, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Dawa #{i + 1}</span>
                        {medForms.length > 1 && (
                          <button onClick={() => removeMed(i)} className="text-error-500 hover:text-error-700">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <select value={med.medication_name} onChange={(e) => updateMed(i, 'medication_name', e.target.value)} className="input">
                        <option value="">Chagua dawa...</option>
                        {COMMON_MEDICATIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={med.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} className="input">
                          <option value="">Kipimo...</option>
                          {DOSAGES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={med.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)} className="input">
                          <option value="">Mara ngapi...</option>
                          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select value={med.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} className="input">
                          <option value="">Muda...</option>
                          {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="number" min={1} value={med.quantity} onChange={(e) => updateMed(i, 'quantity', parseInt(e.target.value) || 1)}
                          className="input" placeholder="Idadi" />
                      </div>
                      <input type="text" value={med.instructions} onChange={(e) => updateMed(i, 'instructions', e.target.value)}
                        className="input" placeholder="Maelezo (mfano: Baada ya chakula)" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 p-4 bg-accent-50 rounded-xl">
                <p className="label text-accent-800">Agiza Kipimo cha Maabara (lahivyo)</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={labTestName} onChange={(e) => {
                    setLabTestName(e.target.value);
                    const test = COMMON_LAB_TESTS.find(t => t.name === e.target.value);
                    if (test) setLabTestCategory(test.category);
                  }} className="input">
                    <option value="">Chagua kipimo...</option>
                    {COMMON_LAB_TESTS.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                  <select value={labTestCategory} onChange={(e) => setLabTestCategory(e.target.value)} className="input">
                    <option value="">Kategoria...</option>
                    {[...new Set(COMMON_LAB_TESTS.map(t => t.category))].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={createPrescription} disabled={creating || !selectedPatient || !selectedIcd || !diagnosis || medForms.every(m => !m.medication_name)}
                className="btn-primary w-full">
                {creating ? <Spinner size={18} /> : <CheckCircle2 size={18} />}
                Thibitisha Dawa
              </button>
            </Card>
          )}

          {tab === 'labs' && (
            <div className="space-y-3">
              {labTests.length === 0 ? (
                <Card><EmptyState icon={FlaskConical} title="Hakuna vipimo vyeoagizwa" /></Card>
              ) : (
                labTests.map((lab) => (
                  <Card key={lab.id} className="p-4" hover>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
                        <FlaskConical size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{lab.test_name}</p>
                            <p className="text-sm text-slate-500">{lab.patient_name} - {lab.test_category}</p>
                          </div>
                          {lab.status === 'ordered' && <Badge color="slate" icon={Clock}>Imeagizwa</Badge>}
                          {lab.status === 'in_progress' && <Badge color="warning" icon={Clock}>Inafanyika</Badge>}
                          {lab.status === 'completed' && <Badge color="success" icon={CheckCircle2}>Imekamilika</Badge>}
                        </div>
                        {lab.results && <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded-lg">{lab.results}</p>}
                        <p className="text-xs text-slate-400 mt-1">{new Date(lab.created_at).toLocaleDateString('sw-TZ')}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'patients' && (
            <div className="space-y-3">
              {patients.length === 0 ? (
                <Card><EmptyState icon={Users} title="Hakuna wagonjwa" /></Card>
              ) : (
                patients.map((p) => (
                  <Card key={p.id} className="p-4" hover>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          {p.phone && <span className="flex items-center gap-1"><Phone size={11} />{p.phone}</span>}
                          {p.location && <span className="flex items-center gap-1"><MapPin size={11} />{p.location}</span>}
                          {p.blood_type && <span>Kundi: {p.blood_type}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => startConsultation(p, 'chat')} className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 flex items-center justify-center transition-colors" title="Chat">
                          <MessageSquare size={16} />
                        </button>
                        <button onClick={() => startConsultation(p, 'voice')} className="w-9 h-9 rounded-xl bg-secondary-50 text-secondary-600 hover:bg-secondary-100 flex items-center justify-center transition-colors" title="Voice Call">
                          <Phone size={16} />
                        </button>
                        <button onClick={() => startConsultation(p, 'video')} className="w-9 h-9 rounded-xl bg-success-50 text-success-600 hover:bg-success-100 flex items-center justify-center transition-colors" title="Video Call">
                          <Video size={16} />
                        </button>
                        <button onClick={() => { setSelectedPatient(p); setTab('create'); }} className="btn-secondary text-xs">
                          <Plus size={14} /> Dawa
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'telehealth' && (
            <div className="space-y-4">
              {/* Active chat */}
              {chatConsultation ? (
                <Card className="h-[600px] overflow-hidden flex flex-col">
                  <DoctorChat
                    consultation={chatConsultation}
                    profile={profile}
                    onVoiceCall={() => { setActiveConsultation(chatConsultation); setCallMode('voice'); }}
                    onVideoCall={() => { setActiveConsultation(chatConsultation); setCallMode('video'); }}
                  />
                </Card>
              ) : (
                <>
                  {/* Start new consultation */}
                  <Card className="p-5">
                    <SectionHeader title="Anza Mazungumzo ya Telehealth" subtitle="Chagua mgonjwa kuanza" />
                    <div className="mb-4">
                      {newConsultationPatient ? (
                        <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-200">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                            <User size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-slate-900">{newConsultationPatient.name}</p>
                            <p className="text-xs text-slate-500">{newConsultationPatient.phone}</p>
                          </div>
                          <button onClick={() => setNewConsultationPatient(null)} className="btn-ghost text-xs">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                            placeholder="Tafuta mgonjwa..." className="input pl-9" />
                        </div>
                      )}
                      {!newConsultationPatient && (
                        <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
                          {filteredPatients.slice(0, 5).map((p) => (
                            <button key={p.id} onClick={() => { setNewConsultationPatient(p); setPatientSearch(''); }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                <User size={16} />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-slate-900">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.phone}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {newConsultationPatient && (
                      <>
                        <div className="mb-4">
                          <label className="label">Sababu ya Mazungumzo (lahivyo)</label>
                          <input type="text" value={consultationReason} onChange={(e) => setConsultationReason(e.target.value)}
                            placeholder="Mfano: Uchunguzi wa homa" className="input" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => startConsultation(newConsultationPatient, 'chat', consultationReason)} className="p-4 rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center">
                            <MessageSquare size={24} className="text-primary-600 mx-auto mb-2" />
                            <p className="font-semibold text-sm text-slate-900">Chat</p>
                            <p className="text-xs text-slate-500">Ujumbe wa maandishi</p>
                          </button>
                          <button onClick={() => startConsultation(newConsultationPatient, 'voice', consultationReason)} className="p-4 rounded-xl border-2 border-slate-200 hover:border-secondary-300 hover:bg-secondary-50 transition-all text-center">
                            <Phone size={24} className="text-secondary-600 mx-auto mb-2" />
                            <p className="font-semibold text-sm text-slate-900">Sauti</p>
                            <p className="text-xs text-slate-500">Simu ya sauti</p>
                          </button>
                          <button onClick={() => startConsultation(newConsultationPatient, 'video', consultationReason)} className="p-4 rounded-xl border-2 border-slate-200 hover:border-success-300 hover:bg-success-50 transition-all text-center">
                            <Video size={24} className="text-success-600 mx-auto mb-2" />
                            <p className="font-semibold text-sm text-slate-900">Video</p>
                            <p className="text-xs text-slate-500">Simu ya video</p>
                          </button>
                        </div>
                      </>
                    )}
                  </Card>

                  {/* Recent consultations */}
                  <Card className="p-5">
                    <SectionHeader title="Mazungumzo ya Karibuni" />
                    {consultations.length === 0 ? (
                      <EmptyState icon={Video} title="Hakuna mazungumzo" description="Anza mazungumzo mapya kwa kuchagua mgonjwa" />
                    ) : (
                      <div className="space-y-2">
                        {consultations.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                              {c.channel === 'video' ? <Video size={18} /> : c.channel === 'voice' ? <Phone size={18} /> : <MessageSquare size={18} />}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-slate-900">{c.patient_name}</p>
                              <p className="text-xs text-slate-500">{c.channel} - {c.reason || 'Hakuna sababu'}</p>
                            </div>
                            {c.status === 'active' && <Badge color="success" icon={Clock}>Inaendelea</Badge>}
                            {c.status === 'completed' && <Badge color="slate" icon={CheckCircle2}>Imekamilika</Badge>}
                            {c.status === 'ringing' && <Badge color="warning" icon={Phone}>Inapiga</Badge>}
                            {c.ai_generated && <Badge color="secondary" icon={Sparkles}>SOAP</Badge>}
                            {c.channel === 'chat' && c.status === 'active' && (
                              <button onClick={() => setChatConsultation(c)} className="btn-ghost text-xs">
                                <MessageSquare size={14} /> Fungua
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
          )}

          {tab === 'scribe' && (
            <div className="space-y-4">
              <Card className="p-4 bg-gradient-to-r from-secondary-50 to-primary-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-700 text-white flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">AI Clinical Scribe & Summarizer</h3>
                    <p className="text-xs text-slate-500">Inasikiliza mazungumzo na kutengeneza SOAP notes kiotomatiki</p>
                  </div>
                </div>
              </Card>

              {activeConsultation ? (
                <AIClinicalScribe consultation={activeConsultation} onSave={saveSOAP} />
              ) : (
                <Card className="p-5">
                  {consultations.filter(c => c.status === 'active' || c.status === 'ringing').length > 0 ? (
                    <>
                      <p className="text-sm text-slate-600 mb-3">Chagua mazungumzo yaliyo hai kutumia AI Scribe:</p>
                      <div className="space-y-2">
                        {consultations.filter(c => c.status === 'active' || c.status === 'ringing').map((c) => (
                          <button key={c.id} onClick={() => setActiveConsultation(c)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-success-100 text-success-600 flex items-center justify-center">
                              {c.channel === 'video' ? <Video size={18} /> : c.channel === 'voice' ? <Phone size={18} /> : <MessageSquare size={18} />}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-slate-900">{c.patient_name}</p>
                              <p className="text-xs text-slate-500">{c.channel} - {c.reason || 'Hakuna sababu'}</p>
                            </div>
                            <Sparkles size={16} className="text-secondary-500" />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={ClipboardList}
                      title="Hakuna mazungumzo hai"
                      description="Anza mazungumzo ya telehealth kwanza, kisha tumia AI Scribe kurekodi na kuchambua"
                    />
                  )}
                  {consultations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Mazungumzo yaliyopita (yenye SOAP):</p>
                      <div className="space-y-1.5">
                        {consultations.filter(c => c.ai_generated).slice(0, 3).map((c) => (
                          <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                            <ClipboardList size={14} className="text-secondary-500" />
                            <span className="text-xs text-slate-600 flex-1">{c.patient_name}</span>
                            <Badge color="secondary" icon={Sparkles}>SOAP</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* QR Modal */}
      <Modal open={!!selectedRx} onClose={() => setSelectedRx(null)} title="QR Code ya Dawa" size="md">
        {selectedRx && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-semibold text-slate-900">{selectedRx.patient_name}</p>
              <p className="text-sm text-slate-500">{selectedRx.icd10_description}</p>
            </div>
            <div className="flex justify-center">
              <PrescriptionQR prescription={selectedRx} medications={medications[selectedRx.id] || []} />
            </div>
          </div>
        )}
      </Modal>

      {/* Created success modal */}
      <Modal open={!!createdRx} onClose={() => setCreatedRx(null)} title="Dawa Zimeandikwa!" size="md">
        {createdRx && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-success-100 text-success-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Dawa zimeandikwa kwa {createdRx.patient_name}</p>
              <p className="text-sm text-slate-500">QR Code na tokeni ya uhakiki zimetengenezwa</p>
            </div>
            <div className="flex justify-center">
              <PrescriptionQR prescription={createdRx} medications={medications[createdRx.id] || []} />
            </div>
            <button onClick={() => setCreatedRx(null)} className="btn-primary w-full">Imekamilika</button>
          </div>
        )}
      </Modal>

      {/* EHR Access Request Modal */}
      {showAccessRequest && pendingEhrPatient && (
        <EhrAccessRequestFlow
          patient={pendingEhrPatient}
          doctor={profile}
          onAccessGranted={() => {
            setEhrPatient(pendingEhrPatient);
            setEhrAccessGranted(true);
            setShowAccessRequest(false);
          }}
          onCancel={() => {
            setShowAccessRequest(false);
            setPendingEhrPatient(null);
          }}
        />
      )}
    </div>
  );
}
