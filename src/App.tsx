import { useState, useEffect } from 'react';
import {
  User, Stethoscope, Package, Microscope, Heart,
  Menu, X, ChevronDown, MapPin, Building2, Siren, Languages,
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/types';
import { Spinner } from '@/components/ui';
import { PatientView } from '@/components/PatientView';
import { DoctorView } from '@/components/DoctorView';
import { PharmacistView } from '@/components/PharmacistView';
import { LabTechView } from '@/components/LabTechView';
import { HospitalDirectory } from '@/components/HospitalDirectory';
import { AmbulanceDispatch } from '@/components/AmbulanceDispatch';
import { HospitalStaffView } from '@/components/HospitalStaffView';
import { useLang } from '@/lib/i18n';

type ScreenId = Role | 'hospitals' | 'emergency';

interface CardConfig {
  id: ScreenId;
  labelKey: string;
  descKey: string;
  icon: typeof User;
  bgClass: string;
  iconBgClass: string;
  iconTextClass: string;
  accentBarClass: string;
  isRole: boolean;
}

const CARDS: CardConfig[] = [
  { id: 'patient', labelKey: 'role.patient', descKey: 'role.patient.desc', icon: User,
    bgClass: 'bg-white', iconBgClass: 'bg-emerald-50', iconTextClass: 'text-emerald-600',
    accentBarClass: 'bg-emerald-500', isRole: true },
  { id: 'doctor', labelKey: 'role.doctor', descKey: 'role.doctor.desc', icon: Stethoscope,
    bgClass: 'bg-white', iconBgClass: 'bg-blue-50', iconTextClass: 'text-blue-600',
    accentBarClass: 'bg-blue-500', isRole: true },
  { id: 'pharmacist', labelKey: 'role.pharmacist', descKey: 'role.pharmacist.desc', icon: Package,
    bgClass: 'bg-white', iconBgClass: 'bg-amber-50', iconTextClass: 'text-amber-600',
    accentBarClass: 'bg-amber-500', isRole: true },
  { id: 'lab_tech', labelKey: 'role.lab_tech', descKey: 'role.lab_tech.desc', icon: Microscope,
    bgClass: 'bg-white', iconBgClass: 'bg-teal-50', iconTextClass: 'text-teal-600',
    accentBarClass: 'bg-teal-500', isRole: true },
  { id: 'hospitals', labelKey: 'role.hospitals', descKey: 'role.hospitals.desc', icon: Building2,
    bgClass: 'bg-white', iconBgClass: 'bg-indigo-50', iconTextClass: 'text-indigo-600',
    accentBarClass: 'bg-indigo-500', isRole: false },
  { id: 'emergency', labelKey: 'role.emergency', descKey: 'role.emergency.desc', icon: Siren,
    bgClass: 'bg-white', iconBgClass: 'bg-red-50', iconTextClass: 'text-red-600',
    accentBarClass: 'bg-red-500', isRole: false },
  { id: 'hospital_staff', labelKey: 'role.hospital_staff', descKey: 'role.hospital_staff.desc', icon: ShieldCheck,
    bgClass: 'bg-white', iconBgClass: 'bg-indigo-50', iconTextClass: 'text-indigo-600',
    accentBarClass: 'bg-indigo-600', isRole: true },
];

const SWITCHER_COLOR_MAP: Record<string, string> = {
  patient: 'bg-emerald-100 text-emerald-600',
  doctor: 'bg-blue-100 text-blue-600',
  pharmacist: 'bg-amber-100 text-amber-600',
  lab_tech: 'bg-teal-100 text-teal-600',
  hospitals: 'bg-indigo-100 text-indigo-600',
  emergency: 'bg-red-100 text-red-600',
  hospital_staff: 'bg-indigo-100 text-indigo-600',
};

function App() {
  const { t, lang, setLang } = useLang();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<ScreenId | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('*').order('name');
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  }

  function selectScreen(screenId: ScreenId) {
    setSelectedScreen(screenId);
    if (CARDS.find((c) => c.id === screenId)?.isRole) {
      const profile = profiles.find((p) => p.role === screenId);
      setActiveProfile(profile || null);
    } else {
      setActiveProfile(null);
    }
    setRoleSwitcherOpen(false);
    setMenuOpen(false);
  }

  function goHome() {
    setSelectedScreen(null);
    setActiveProfile(null);
    setMenuOpen(false);
    setRoleSwitcherOpen(false);
  }

  function toggleLang() {
    setLang(lang === 'sw' ? 'en' : 'sw');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Spinner size={40} />
          <p className="text-slate-500 mt-3 text-sm">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (!selectedScreen || (CARDS.find((c) => c.id === selectedScreen)?.isRole && !activeProfile)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold shadow-sm"
              title={t('lang.toggle')}
            >
              <Languages size={16} />
              <span className="text-slate-900">{lang === 'sw' ? 'SW' : 'EN'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">{lang === 'sw' ? 'EN' : 'SW'}</span>
            </button>
          </div>

          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white mb-4 shadow-lg shadow-emerald-500/20">
              <Heart size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 font-sans">AfyaApp</h1>
            <p className="text-slate-500 mt-2">{t('app.tagline')}</p>
            <p className="text-sm text-slate-400 mt-1">{t('app.chooseRole')}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-slide-up">
            {CARDS.map((card) => (
              <button
                key={card.id}
                onClick={() => selectScreen(card.id)}
                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] text-left"
              >
                <div className={`h-1.5 w-full ${card.accentBarClass}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${card.iconBgClass} ${card.iconTextClass} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <card.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-lg leading-tight">
                        {t(card.labelKey)}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-snug line-clamp-2">
                        {t(card.descKey)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 transition-colors mt-auto">
                      <span className="text-xs font-semibold">
                        {lang === 'sw' ? 'Endelea' : 'Continue'}
                      </span>
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            {t('app.demoNote')}
          </p>
        </div>
      </div>
    );
  }

  const isRoleView = CARDS.find((c) => c.id === selectedScreen)?.isRole;
  const currentCard = CARDS.find((c) => c.id === selectedScreen);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={goHome} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
                <Heart size={18} />
              </div>
              <div className="text-left">
                <h1 className="font-bold text-slate-900 text-base leading-none">AfyaApp</h1>
                <p className="text-xs text-slate-500 leading-none mt-0.5">{t('app.tagline')}</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-sm font-bold"
              title={t('lang.toggle')}
            >
              <Languages size={15} />
              <span>{lang === 'sw' ? 'SW' : 'EN'}</span>
            </button>

            <div className="relative hidden sm:block">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SWITCHER_COLOR_MAP[selectedScreen || ''] || 'bg-slate-100 text-slate-600'}`}>
                  {(() => {
                    const Icon = currentCard?.icon || User;
                    return <Icon size={16} />;
                  })()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-none">
                    {isRoleView ? activeProfile?.name : t(currentCard?.labelKey || '')}
                  </p>
                  <p className="text-xs text-slate-500 leading-none mt-0.5">
                    {t(currentCard?.labelKey || '')}
                  </p>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {roleSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleSwitcherOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 overflow-hidden animate-slide-up">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('app.switchRole')}</p>
                    </div>
                    {CARDS.map((c) => {
                      const prof = c.isRole ? profiles.find((p) => p.role === c.id) : null;
                      return (
                        <button
                          key={c.id}
                          onClick={() => selectScreen(c.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left ${
                            selectedScreen === c.id ? 'bg-slate-50' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SWITCHER_COLOR_MAP[c.id]}`}>
                            <c.icon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{t(c.labelKey)}</p>
                            <p className="text-xs text-slate-500">
                              {c.isRole ? (prof?.name || t('app.noAccount')) : t(c.descKey).split('.')[0]}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden btn-ghost">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white animate-slide-up">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t('app.switchRole')}</p>
              <div className="space-y-1">
                {CARDS.map((c) => {
                  const prof = c.isRole ? profiles.find((p) => p.role === c.id) : null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectScreen(c.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                        selectedScreen === c.id ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SWITCHER_COLOR_MAP[c.id]}`}>
                        <c.icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t(c.labelKey)}</p>
                        <p className="text-xs text-slate-500">
                          {c.isRole ? (prof?.name || t('app.noAccount')) : t(c.descKey).split('.')[0]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 pb-20">
        {selectedScreen === 'patient' && activeProfile && <PatientView profile={activeProfile} />}
        {selectedScreen === 'doctor' && activeProfile && <DoctorView profile={activeProfile} />}
        {selectedScreen === 'pharmacist' && activeProfile && <PharmacistView profile={activeProfile} />}
        {selectedScreen === 'lab_tech' && activeProfile && <LabTechView profile={activeProfile} />}
        {selectedScreen === 'hospitals' && <HospitalsView />}
        {selectedScreen === 'emergency' && <EmergencyView />}
        {selectedScreen === 'hospital_staff' && activeProfile && <HospitalStaffView profile={activeProfile} />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Heart size={14} className="text-emerald-600" />
              <span>{t('app.footer')}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin size={12} /> {t('app.location')}</span>
              <span>v2.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HospitalsView() {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <div className="card p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('hospitals.title')}</h2>
            <p className="text-sm text-indigo-100">{t('hospitals.subtitle')}</p>
          </div>
        </div>
      </div>
      <HospitalDirectory />
    </div>
  );
}

function EmergencyView() {
  const { t } = useLang();
  const [patientProfile, setPatientProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadPatient() {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'patient').limit(1).single();
      if (data) setPatientProfile(data as Profile);
    }
    loadPatient();
  }, []);

  if (!patientProfile) {
    return <div className="py-20 flex justify-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 bg-gradient-to-br from-red-500 to-red-700 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Siren size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('emergency.title')}</h2>
            <p className="text-sm text-red-100">{t('emergency.subtitle')}</p>
          </div>
        </div>
      </div>
      <AmbulanceDispatch profile={patientProfile} />
    </div>
  );
}

export default App;
