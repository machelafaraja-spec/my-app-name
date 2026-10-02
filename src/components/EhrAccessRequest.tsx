import { useState, useEffect } from 'react';
import { Shield, Lock, KeyRound, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, EhrAccessRequest } from '@/types';
import { Modal, Spinner, Badge } from './ui';

interface EhrAccessRequestFlowProps {
  patient: Profile;
  doctor: Profile;
  onAccessGranted: () => void;
  onCancel: () => void;
}

export function EhrAccessRequestFlow({ patient, doctor, onAccessGranted, onCancel }: EhrAccessRequestFlowProps) {
  const [step, setStep] = useState<'requesting' | 'awaiting_otp' | 'verifying' | 'granted' | 'denied'>('requesting');
  const [accessRequest, setAccessRequest] = useState<EhrAccessRequest | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [error, setError] = useState('');

  // Check for existing valid access
  useEffect(() => {
    async function checkExisting() {
      const { data } = await supabase
        .from('ehr_access_requests')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('requester_id', doctor.id)
        .eq('status', 'granted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setAccessRequest(data as EhrAccessRequest);
        setStep('granted');
        setTimeout(onAccessGranted, 800);
      } else {
        createAccessRequest();
      }
    }
    checkExisting();
  }, [patient.id, doctor.id]);

  async function createAccessRequest() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const { data } = await supabase.from('ehr_access_requests').insert({
      patient_id: patient.id,
      requester_id: doctor.id,
      requester_name: doctor.name,
      requester_role: doctor.role,
      otp_code: otp,
      status: 'pending',
    }).select('*').single();

    if (data) {
      setAccessRequest(data as EhrAccessRequest);
      setStep('awaiting_otp');
    }
  }

  async function verifyOtp() {
    if (!accessRequest) return;
    setError('');

    if (enteredOtp === accessRequest.otp_code) {
      await supabase.from('ehr_access_requests').update({
        status: 'granted',
        granted_at: new Date().toISOString(),
      }).eq('id', accessRequest.id);

      setStep('granted');
      setTimeout(onAccessGranted, 1000);
    } else {
      setError('Msimbo si sahihi. Jaribu tena.');
    }
  }

  async function denyAccess() {
    if (accessRequest) {
      await supabase.from('ehr_access_requests').update({ status: 'denied' }).eq('id', accessRequest.id);
    }
    setStep('denied');
  }

  return (
    <Modal open onClose={onCancel} title="Ombi la Ufikiaji wa Afya" size="md">
      <div className="space-y-4">
        {/* Patient info */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {patient.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{patient.name}</p>
            <p className="text-xs text-slate-500 font-mono">{patient.patient_id_number || 'Hakana ID'}</p>
            {patient.phone && <p className="text-xs text-slate-500">{patient.phone}</p>}
          </div>
        </div>

        {step === 'requesting' && (
          <div className="flex flex-col items-center py-8">
            <Spinner size={32} />
            <p className="text-slate-600 font-semibold mt-4">Inaomba ufikiaji...</p>
          </div>
        )}

        {step === 'awaiting_otp' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <p className="font-semibold text-blue-900 text-sm">Ombi limetumwa</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Msimbo wa OTP umetumwa kwa {patient.name} ({patient.phone || 'Hakana simu'}).
                  Ingiza msimbo ili kuthibitisha ufikiaji.
                </p>
              </div>
            </div>

            {/* Demo OTP display (in production this would be sent via SMS) */}
            {accessRequest && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-800 font-semibold">Demo: OTP ni</p>
                <p className="text-2xl font-mono font-bold text-amber-900 tracking-widest">{accessRequest.otp_code}</p>
              </div>
            )}

            <div>
              <label className="label">Ingiza Msimbo wa OTP</label>
              <input
                type="text"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="input text-center text-2xl font-mono tracking-widest"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button onClick={verifyOtp} disabled={enteredOtp.length !== 6} className="btn-primary w-full">
              <Shield size={18} /> Thibitisha Ufikiaji
            </button>
            <button onClick={denyAccess} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">
              Futa Ombi
            </button>
          </div>
        )}

        {step === 'granted' && (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <p className="text-slate-900 font-bold text-lg mt-4">Ufikiaji Umethibitishwa!</p>
            <p className="text-slate-500 text-sm mt-1">Unaweza sasa kuangalia historia ya afya ya mgonjwa</p>
          </div>
        )}

        {step === 'denied' && (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <X size={36} className="text-red-600" />
            </div>
            <p className="text-slate-900 font-bold text-lg mt-4">Ufikiaji Umekataliwa</p>
            <p className="text-slate-500 text-sm mt-1">Ombi la ufikiaji limefutwa</p>
            <button onClick={onCancel} className="btn-secondary mt-4">Rudi</button>
          </div>
        )}

        {/* Privacy notice */}
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <Lock size={12} />
          <span>Kufuata HIPAA/PDPC — ufikiaji unahitaji ridhaa ya mgonjwa</span>
        </div>
      </div>
    </Modal>
  );
}
