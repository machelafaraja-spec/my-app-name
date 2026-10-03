import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Siren, MapPin, Crosshair, Phone, Navigation, Clock,
  Truck, CheckCircle2, AlertTriangle, X, Activity, HeartPulse,
  Baby, Stethoscope, Loader2, Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Hospital, AmbulanceRequest } from '@/types';
import { Card, Badge, Spinner, Modal, SectionHeader, EmptyState } from './ui';

const EMERGENCY_TYPES = [
  { id: 'trauma', label: 'Trauma / Ajali', sw: 'Trauma / Ajali', icon: AlertTriangle, color: 'error' as const, desc: 'Ajali, jeraha, kuanguka' },
  { id: 'cardiac', label: 'Cardiac / Moyo', sw: 'Cardiac / Moyo', icon: HeartPulse, color: 'error' as const, desc: 'Shida ya moyo, kifua' },
  { id: 'maternal', label: 'Maternal / Uzazi', sw: 'Maternal / Uzazi', icon: Baby, color: 'warning' as const, desc: 'Mimba, uzazi wa dharura' },
  { id: 'general', label: 'General Medical', sw: 'Dharura ya Matibabu', icon: Stethoscope, color: 'primary' as const, desc: 'Hali nyingine ya dharura' },
];

const URGENCY_LEVELS = [
  { id: 'critical', label: 'Kritikali', en: 'Critical', color: 'error' as const },
  { id: 'urgent', label: 'Haraka', en: 'Urgent', color: 'warning' as const },
  { id: 'normal', label: 'Kawaida', en: 'Normal', color: 'primary' as const },
];

const STATUS_CONFIG: Record<string, { sw: string; en: string; color: 'slate' | 'warning' | 'secondary' | 'success' | 'error'; icon: typeof Truck }> = {
  dispatched: { sw: 'Imetumwa', en: 'Dispatched', color: 'secondary', icon: Radio },
  en_route: { sw: 'Inakuja', en: 'En Route', color: 'warning', icon: Truck },
  arrived: { sw: 'Imefika', en: 'Arrived', color: 'success', icon: CheckCircle2 },
  transporting: { sw: 'Inapeleka Hospitali', en: 'Transporting', color: 'secondary', icon: Navigation },
  completed: { sw: 'Imekamilika', en: 'Completed', color: 'success', icon: CheckCircle2 },
  cancelled: { sw: 'Imefutwa', en: 'Cancelled', color: 'error', icon: X },
};

interface AmbulanceDispatchProps {
  profile: Profile;
}

export function AmbulanceDispatch({ profile }: AmbulanceDispatchProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulanceRequests, setAmbulanceRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [emergencyType, setEmergencyType] = useState<string>('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'critical'>('urgent');
  const [useGPS, setUseGPS] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [reason, setReason] = useState('');

  // Active request tracking
  const [activeRequest, setActiveRequest] = useState<AmbulanceRequest | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [hospRes, ambRes] = await Promise.all([
      supabase.from('hospitals').select('*').eq('status', 'verified').order('name'),
      supabase.from('ambulance_requests').select('*').eq('patient_id', profile.id).order('created_at', { ascending: false }),
    ]);
    setHospitals((hospRes.data as Hospital[]) || []);
    setAmbulanceRequests((ambRes.data as AmbulanceRequest[]) || []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time subscription for ambulance status updates
  useEffect(() => {
    const channel = supabase
      .channel('ambulance_updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ambulance_requests', filter: `patient_id=eq.${profile.id}` },
        (payload) => {
          const updated = payload.new as AmbulanceRequest;
          setAmbulanceRequests((prev) => prev.map((a) => a.id === updated.id ? updated : a));
          if (activeRequest && activeRequest.id === updated.id) {
            setActiveRequest(updated);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.id, activeRequest]);

  // Simulate ambulance status progression
  useEffect(() => {
    if (!activeRequest || activeRequest.status === 'completed' || activeRequest.status === 'cancelled') {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      return;
    }

    const statusOrder: AmbulanceRequest['status'][] = ['dispatched', 'en_route', 'arrived', 'transporting', 'completed'];
    const currentIndex = statusOrder.indexOf(activeRequest.status);

    if (currentIndex >= 0 && currentIndex < statusOrder.length - 1) {
      statusIntervalRef.current = setInterval(async () => {
        const nextStatus = statusOrder[currentIndex + 1];
        const etaMap: Record<string, number> = { dispatched: 12, en_route: 5, arrived: 0, transporting: 15 };
        const updates: Record<string, unknown> = {
          status: nextStatus,
          eta_minutes: etaMap[nextStatus] ?? null,
        };

        const { data } = await supabase
          .from('ambulance_requests')
          .update(updates)
          .eq('id', activeRequest.id)
          .select('*')
          .single();

        if (data) {
          const updated = data as AmbulanceRequest;
          setActiveRequest(updated);
          setAmbulanceRequests((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        }
      }, 8000);
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [activeRequest]);

  function detectLocation() {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setUseGPS(false);
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        setUseGPS(false);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitSOS() {
    if (!emergencyType) return;
    if (useGPS && latitude === null) return;
    if (!useGPS && !manualAddress.trim()) return;

    setSubmitting(true);
    const hosp = hospitals.find((h) => h.id === selectedHospital);
    const etaMap: Record<string, number> = { critical: 5, urgent: 10, normal: 20 };

    const { data } = await supabase.from('ambulance_requests').insert({
      patient_id: profile.id,
      patient_name: profile.name,
      pickup_address: useGPS ? `GPS: ${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}` : manualAddress.trim(),
      pickup_latitude: useGPS ? latitude : null,
      pickup_longitude: useGPS ? longitude : null,
      destination_hospital_id: selectedHospital || null,
      destination_name: hosp?.name || null,
      reason: reason.trim() || EMERGENCY_TYPES.find((e) => e.id === emergencyType)?.sw || null,
      urgency,
      status: 'dispatched',
      eta_minutes: etaMap[urgency],
    }).select('*').single();

    if (data) {
      const req = data as AmbulanceRequest;
      setAmbulanceRequests((prev) => [req, ...prev]);
      setActiveRequest(req);
      setSosModalOpen(false);
      // Reset form
      setEmergencyType('');
      setUrgency('urgent');
      setManualAddress('');
      setSelectedHospital('');
      setReason('');
    }
    setSubmitting(false);
  }

  async function cancelRequest() {
    if (!activeRequest) return;
    await supabase.from('ambulance_requests').update({ status: 'cancelled' }).eq('id', activeRequest.id);
    setAmbulanceRequests((prev) => prev.map((a) => a.id === activeRequest.id ? { ...a, status: 'cancelled' } : a));
    setActiveRequest(null);
  }

  const hasActiveRequest = activeRequest && activeRequest.status !== 'completed' && activeRequest.status !== 'cancelled';

  return (
    <div className="space-y-4">
      {/* SOS Button */}
      {!hasActiveRequest && (
        <Card className="p-6 text-center border-2 border-error-200 bg-gradient-to-b from-error-50 to-white">
          <div className="w-20 h-20 rounded-full bg-error-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-error-500/30 animate-pulse-soft">
            <Siren size={36} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Dharura ya Ambulansi</h3>
          <p className="text-sm text-slate-500 mb-4">Bonyeza kitufe cha SOS kuagiza ambulansi haraka</p>
          <button
            onClick={() => { setSosModalOpen(true); detectLocation(); }}
            className="btn bg-error-500 text-white px-8 py-3.5 hover:bg-error-600 active:scale-[0.98] shadow-lg shadow-error-500/20 text-base font-bold"
          >
            <Siren size={20} /> SOS - Agiza Ambulansi
          </button>
        </Card>
      )}

      {/* Active request tracking */}
      {hasActiveRequest && activeRequest && (
        <Card className="overflow-hidden border-2 border-warning-200">
          <div className="p-5 bg-gradient-to-br from-warning-500 to-error-500 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Truck size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Ambulansi Inakuja</h3>
                <p className="text-sm text-white/80">
                  {STATUS_CONFIG[activeRequest.status]?.sw || activeRequest.status}
                  {activeRequest.eta_minutes != null && activeRequest.eta_minutes > 0 && ` - ETA: ${activeRequest.eta_minutes} dk`}
                </p>
              </div>
            </div>

            {/* Status progress bar */}
            <div className="flex items-center gap-1.5 mt-4">
              {(['dispatched', 'en_route', 'arrived', 'transporting', 'completed'] as const).map((step, i) => {
                const statusOrder = ['dispatched', 'en_route', 'arrived', 'transporting', 'completed'];
                const currentIdx = statusOrder.indexOf(activeRequest.status);
                const isDone = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone ? 'bg-white text-error-600' : 'bg-white/20 text-white/60'
                    } ${isCurrent ? 'ring-4 ring-white/30' : ''}`}>
                      {isDone && !isCurrent ? <CheckCircle2 size={16} /> :
                        isCurrent ? <Loader2 size={16} className="animate-spin" /> :
                        <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    {i < 4 && <div className={`h-1 flex-1 rounded-full mx-1 ${isDone ? 'bg-white' : 'bg-white/20'}`} />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-white/70">
              <span>Imetumwa</span>
              <span>Inakuja</span>
              <span>Imefika</span>
              <span>Hospitali</span>
              <span>Imekamilika</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-slate-400" />
              <span className="text-slate-600">Eneo: {activeRequest.pickup_address}</span>
            </div>
            {activeRequest.destination_name && (
              <div className="flex items-center gap-2 text-sm">
                <Navigation size={16} className="text-slate-400" />
                <span className="text-slate-600">Hospitali: {activeRequest.destination_name}</span>
              </div>
            )}
            {activeRequest.reason && (
              <div className="flex items-center gap-2 text-sm">
                <Activity size={16} className="text-slate-400" />
                <span className="text-slate-600">Sababu: {activeRequest.reason}</span>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {activeRequest.status !== 'arrived' && activeRequest.status !== 'transporting' && activeRequest.status !== 'completed' && (
                <button onClick={cancelRequest} className="btn-danger text-xs flex-1">
                  <X size={14} /> Futa Ombi
                </button>
              )}
              {activeRequest.status === 'arrived' && (
                <div className="flex-1 p-2 bg-success-50 rounded-lg text-center text-sm text-success-700 font-semibold">
                  <CheckCircle2 size={14} className="inline mr-1" /> Ambulansi imefika! Jitayarishe kuondoka.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* History */}
      <Card className="p-5">
        <SectionHeader title="Historia ya Ambulansi" subtitle="Maombi ya zamani ya dharura" />
        {ambulanceRequests.length === 0 ? (
          <EmptyState icon={Siren} title="Hakuna maombi ya ambulansi" description="Maombi yako ya dharura yataonekana hapa" />
        ) : (
          <div className="space-y-2">
            {ambulanceRequests.slice(0, 5).map((req) => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.dispatched;
              const urgencyCfg = URGENCY_LEVELS.find((u) => u.id === req.urgency);
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    req.urgency === 'critical' ? 'bg-error-100 text-error-600' :
                    req.urgency === 'urgent' ? 'bg-warning-100 text-warning-600' :
                    'bg-primary-100 text-primary-600'
                  }`}>
                    <cfg.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{req.reason || req.pickup_address}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(req.created_at).toLocaleDateString('sw-TZ')} - {req.pickup_address}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge color={cfg.color}>{cfg.sw}</Badge>
                    {urgencyCfg && <Badge color={urgencyCfg.color}>{urgencyCfg.label}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* SOS Modal */}
      <Modal open={sosModalOpen} onClose={() => setSosModalOpen(false)} title="Agiza Ambulansi ya Dharura" size="md">
        <div className="space-y-4">
          {/* Emergency type */}
          <div>
            <label className="label">Aina ya Dharura</label>
            <div className="grid grid-cols-2 gap-2">
              {EMERGENCY_TYPES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEmergencyType(e.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    emergencyType === e.id
                      ? `border-${e.color}-500 bg-${e.color}-50`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <e.icon size={20} className={emergencyType === e.id ? `text-${e.color}-600` : 'text-slate-400'} />
                  <p className="font-semibold text-sm mt-1.5">{e.sw}</p>
                  <p className="text-xs text-slate-500">{e.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="label">Kiwango cha Dharura</label>
            <div className="flex gap-2">
              {URGENCY_LEVELS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUrgency(u.id as 'normal' | 'urgent' | 'critical')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    urgency === u.id
                      ? `bg-${u.color}-600 text-white`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="label">Eneo la Kukutolea</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { setUseGPS(true); detectLocation(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  useGPS ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                GPS Auto
              </button>
              <button
                onClick={() => setUseGPS(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  !useGPS ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MapPin size={16} />
                Andika Mwenyewe
              </button>
            </div>
            {useGPS ? (
              <div className="p-3 bg-slate-50 rounded-xl">
                {latitude !== null ? (
                  <div className="flex items-center gap-2 text-sm text-success-700">
                    <CheckCircle2 size={16} />
                    <span>Eneo limegunduliwa: {latitude.toFixed(4)}, {longitude?.toFixed(4)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                    <span>{gpsLoading ? 'Inagundua eneo...' : 'Bonyeza GPS Auto kugundua eneo'}</span>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Mfano: Mtaa wa Mlimani, Nyumba Na. 15, Dodoma"
                className="input"
              />
            )}
          </div>

          {/* Destination hospital */}
          <div>
            <label className="label">Hospitali ya Kufikisha (lahivyo)</label>
            <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} className="input">
              <option value="">Chagua hospitali...</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="label">Maelezo ya Ziada (lahivyo)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Eleza hali ya mgonjwa..."
              rows={2}
              className="input resize-none"
            />
          </div>

          <button
            onClick={submitSOS}
            disabled={submitting || !emergencyType || (useGPS && latitude === null) || (!useGPS && !manualAddress.trim())}
            className="btn bg-error-500 text-white w-full py-3 hover:bg-error-600 active:scale-[0.98] shadow-lg shadow-error-500/20 font-bold"
          >
            {submitting ? <Spinner size={18} /> : <Siren size={18} />}
            Tuma Ombi la Dharura
          </button>
        </div>
      </Modal>
    </div>
  );
}
