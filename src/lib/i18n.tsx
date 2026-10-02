import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Lang = 'sw' | 'en';

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

const translations: Record<string, { sw: string; en: string }> = {
  'app.tagline': { sw: 'Jukwaa la Afya ya Kidijitali Tanzania', en: 'Tanzania Digital Health Platform' },
  'app.chooseRole': { sw: 'Chagua nafasi yako kuendelea', en: 'Choose your role to continue' },
  'app.loading': { sw: 'Inapakia AfyaApp...', en: 'Loading AfyaApp...' },
  'app.switchRole': { sw: 'Badili Nafasi', en: 'Switch Role' },
  'app.demoNote': { sw: 'Kwa matumizi ya demo, kila nafasi inatumia akaunti iliyotengenezwa', en: 'For demo use, each role uses a pre-created account' },
  'app.noAccount': { sw: 'Hakuna akaunti', en: 'No account' },
  'app.footer': { sw: 'AfyaApp - Afya ya Kidijitali Tanzania', en: 'AfyaApp - Digital Health Tanzania' },
  'app.location': { sw: 'Dar es Salaam, Tanzania', en: 'Dar es Salaam, Tanzania' },
  'role.patient': { sw: 'Mgonjwa', en: 'Patient' },
  'role.patient.desc': { sw: 'Angalia dawa, agiza famasia, na zungumza na msaidizi wa afya', en: 'View prescriptions, order from pharmacy, and chat with a health assistant' },
  'role.doctor': { sw: 'Daktari', en: 'Doctor' },
  'role.doctor.desc': { sw: 'Andika dawa, agiza vipimo, na dhibili wagonjwa', en: 'Write prescriptions, order lab tests, and manage patients' },
  'role.pharmacist': { sw: 'Famasia', en: 'Pharmacy' },
  'role.pharmacist.desc': { sw: 'Skana QR, thibitisha dawa, na jaza maagizo', en: 'Scan QR, verify medications, and fulfill orders' },
  'role.lab_tech': { sw: 'Maabara', en: 'Laboratory' },
  'role.lab_tech.desc': { sw: 'Fuatilia vipimo, andika matokeo, na update status', en: 'Track tests, record results, and update status' },
  'role.hospitals': { sw: 'Hospitali na Vitengo', en: 'Hospitals & WHO Units' },
  'role.hospitals.desc': { sw: 'Tafuta hospitali na idara zake kulingana na viwango vya WHO', en: 'Find hospitals and their departments per WHO standards' },
  'role.emergency': { sw: 'Ambulansi ya Dharura', en: 'Emergency Ambulance' },
  'role.emergency.desc': { sw: 'Agiza ambulansi ya dharura kwa GPS na ufuatilie hadi kufika hospitali', en: 'Request emergency ambulance with GPS and track until hospital arrival' },
  'lang.sw': { sw: 'Kiswahili', en: 'Swahili' },
  'lang.en': { sw: 'Kiingereza', en: 'English' },
  'lang.toggle': { sw: 'Badili Lugha', en: 'Switch Language' },
  'hospitals.title': { sw: 'Hospitali na Vitengo', en: 'Hospitals & WHO Units' },
  'hospitals.subtitle': { sw: 'Idara za Hospitali kulingana na Viwango vya WHO', en: 'Hospital Departments per WHO Standards' },
  'emergency.title': { sw: 'Ambulansi ya Dharura', en: 'Emergency Ambulance' },
  'emergency.subtitle': { sw: 'Mfumo wa Utagatizi wa Ambulansi ya Dharura', en: 'Emergency Ambulance Dispatch System' },
  'doctor.dir.title': { sw: 'Chagua Daktari', en: 'Choose Your Doctor' },
  'doctor.dir.subtitle': { sw: 'Angalia bei na upatikanaji wa daktari', en: 'Browse doctor availability and consultation fees' },
  'doctor.dir.online': { sw: 'Mtandaoni', en: 'Online' },
  'doctor.dir.offline': { sw: 'Hapatikani', en: 'Offline' },
  'doctor.dir.fee': { sw: 'TSh', en: 'TSh' },
  'doctor.dir.perConsult': { sw: 'kwa kikao', en: 'per consultation' },
  'doctor.dir.startConsult': { sw: 'Anza Ushauri', en: 'Start Consultation' },
  'doctor.dir.offlineMsg': { sw: 'Daktari hayapatikani mtandaoni', en: 'Doctor is currently offline' },
  'doctor.dir.noDoctors': { sw: 'Hakuna madaktari waliosajiliwa', en: 'No doctors registered' },
  'doctor.dir.noDoctorsDesc': { sw: 'Madaktari wataonekana hapa wakati watakapojiwa', en: 'Doctors will appear here once registered' },
  'doctor.dir.recentConsults': { sw: 'Mazungumzo ya Karibuni', en: 'Recent Consultations' },
  'doctor.dir.noConsults': { sw: 'Hakuna mazungumzo', en: 'No consultations yet' },
  'doctor.dir.noConsultsDesc': { sw: 'Anza mazungumzo kwa kuchagua daktari hapo juu', en: 'Start a consultation by selecting a doctor above' },
  'doctor.dir.chat': { sw: 'Ujumbe', en: 'Chat' },
  'doctor.dir.voice': { sw: 'Sauti', en: 'Voice' },
  'doctor.dir.video': { sw: 'Video', en: 'Video' },
  'doctor.dir.openChat': { sw: 'Fungua', en: 'Open' },
  'doctor.dir.join': { sw: 'Jiunge', en: 'Join' },
  'doctor.dir.ongoing': { sw: 'Inaendelea', en: 'Ongoing' },
  'doctor.dir.completed': { sw: 'Imekamilika', en: 'Completed' },
  'doctor.dir.ringing': { sw: 'Inapiga', en: 'Ringing' },
  'doctor.dir.noReason': { sw: 'Hakuna sababu', en: 'No reason' },
  'doctor.dir.selectChannel': { sw: 'Chagua njia ya mawasiliano', en: 'Select communication channel' },
  'doctor.dir.textMsg': { sw: 'Ujumbe wa maandishi', en: 'Text messages' },
  'doctor.dir.voiceCall': { sw: 'Simu ya sauti', en: 'Voice call' },
  'doctor.dir.videoCall': { sw: 'Simu ya video', en: 'Video call' },
  'call.connecting': { sw: 'Inaunganisha...', en: 'Connecting...' },
  'call.connected': { sw: 'Imeunganishwa', en: 'Connected' },
  'call.ringing': { sw: 'Inapiga simu...', en: 'Ringing...' },
  'call.videoCall': { sw: 'Simu ya Video', en: 'Video Call' },
  'call.voiceCall': { sw: 'Simu ya Sauti', en: 'Voice Call' },
  'call.chat': { sw: 'Ujumbe', en: 'Chat' },
  'call.mute': { sw: 'Zima sauti', en: 'Mute' },
  'call.unmute': { sw: 'Washa sauti', en: 'Unmute' },
  'call.videoOn': { sw: 'Washa video', en: 'Turn on video' },
  'call.videoOff': { sw: 'Zima video', en: 'Turn off video' },
  'call.endCall': { sw: 'Maliza simu', en: 'End call' },
  'call.screenShare': { sw: 'Shiriki skrini', en: 'Share screen' },
  'call.chatPanel': { sw: 'Ujumbe', en: 'Chat' },
  'call.typeMessage': { sw: 'Andika ujumbe...', en: 'Type a message...' },
  'call.send': { sw: 'Tuma', en: 'Send' },
  'call.attachImage': { sw: 'Ambata picha', en: 'Attach image' },
  'doctor.incoming.title': { sw: 'Simu Inakuja', en: 'Incoming Call' },
  'doctor.incoming.patient': { sw: 'Mgonjwa', en: 'Patient' },
  'doctor.incoming.accept': { sw: 'Kubali', en: 'Accept' },
  'doctor.incoming.decline': { sw: 'Kataa', en: 'Decline' },
  'doctor.incoming.withScribe': { sw: 'Kubali na AI Scribe', en: 'Accept with AI Scribe' },
  'role.hospital_staff': { sw: 'Mfanyakazi wa Hospitali', en: 'Hospital Staff' },
  'role.hospital_staff.desc': { sw: 'Dhibili idara za ndani, fuatilia wagonjwa, na CME', en: 'Manage internal units, track patients, and CME' },
  'patient.hospital.title': { sw: 'Chagua Hospitali', en: 'Select Hospital' },
  'patient.hospital.subtitle': { sw: 'Chagua hospitali kuona madaktari waliohusishwa', en: 'Choose a hospital to see affiliated doctors' },
  'patient.hospital.allHospitals': { sw: 'Hospitali Zote', en: 'All Hospitals' },
  'patient.hospital.doctorsAt': { sw: 'Madaktari katika', en: 'Doctors at' },
  'patient.hospital.noDoctorsAt': { sw: 'Hakuna madaktari katika hospitali hii', en: 'No doctors at this hospital' },
  'patient.hospital.restrictedUnits': { sw: 'Idara za ndani zinapatikana kwa wafanyakazi wa hospitali tu', en: 'Internal units are accessible to hospital staff only' },
  'hospitals.staff.title': { sw: 'Dashibodi ya Wafanyakazi wa Hospitali', en: 'Hospital Staff Dashboard' },
  'hospitals.staff.subtitle': { sw: 'Idara za ndani, fuatilia wagonjwa, na elimu ya CME', en: 'Internal units, patient tracking, and CME education' },
  'hospitals.staff.selectHospital': { sw: 'Chagua Hospitali', en: 'Select Hospital' },
  'hospitals.staff.units': { sw: 'Idara za Ndani', en: 'Internal Units' },
  'hospitals.staff.patientTracking': { sw: 'Ufuatiliaji wa Wagonjwa', en: 'Patient Tracking' },
  'hospitals.staff.activePatients': { sw: 'Wagonjwa Walio Hudhurini', en: 'Active Patients' },
  'hospitals.staff.discharged': { sw: 'Walioondolewa', en: 'Discharged' },
  'hospitals.staff.transferred': { sw: 'Hamishiwa', en: 'Transferred' },
  'hospitals.staff.transferPatient': { sw: 'Hamisha Mgonjwa', en: 'Transfer Patient' },
  'hospitals.staff.dischargePatient': { sw: 'Ondoa Mgonjwa', en: 'Discharge Patient' },
  'hospitals.staff.fromUnit': { sw: 'Kutoka Idara', en: 'From Unit' },
  'hospitals.staff.toUnit': { sw: 'Kwenda Idara', en: 'To Unit' },
  'hospitals.staff.reason': { sw: 'Sababu', en: 'Reason' },
  'hospitals.staff.patientName': { sw: 'Jina la Mgonjwa', en: 'Patient Name' },
  'hospitals.staff.attendingStaff': { sw: 'Mfanyakazi anayehudhuria', en: 'Attending Staff' },
  'hospitals.staff.noTransfers': { sw: 'Hakuna wagonjwa waliohudhurini', en: 'No active patient transfers' },
  'hospitals.staff.admittedAt': { sw: 'Aliingia', en: 'Admitted' },
  'hospitals.staff.dischargedAt': { sw: 'Aliondolewa', en: 'Discharged' },
  'huddle.title': { sw: 'Kituo cha Telehealth & Elimu', en: 'Telehealth & Education Hub' },
  'huddle.subtitle': { sw: 'Mikutano ya video, mafunzo ya CME, na ushauri wa wataalamu', en: 'Video conferences, CME training, and specialist mentorship' },
  'huddle.newSession': { sw: 'Anza Mkutano Mpya', en: 'Start New Session' },
  'huddle.join': { sw: 'Jiunge', en: 'Join' },
  'huddle.active': { sw: 'Inaendelea', en: 'Active' },
  'huddle.scheduled': { sw: 'Imepangwa', en: 'Scheduled' },
  'huddle.completed': { sw: 'Imekamilika', en: 'Completed' },
  'huddle.huddle': { sw: 'Mkutano wa Asubuhi', en: 'Morning Huddle' },
  'huddle.handover': { sw: 'Kukabidhi Zamu', en: 'Shift Handover' },
  'huddle.cme': { sw: 'Mafunzo ya CME', en: 'CME Training' },
  'huddle.mentorship': { sw: 'Ushauri wa Mtaalamu', en: 'Specialist Mentorship' },
  'huddle.host': { sw: 'Mwenyeji', en: 'Host' },
  'huddle.noSessions': { sw: 'Hakuna mikutano', en: 'No sessions scheduled' },
  'huddle.sessionTitle': { sw: 'Kichwa cha Mkutano', en: 'Session Title' },
  'huddle.sessionType': { sw: 'Aina ya Mkutano', en: 'Session Type' },
  'huddle.start': { sw: 'Anza', en: 'Start' },
  'huddle.end': { sw: 'Maliza', en: 'End' },
  'huddle.liveNow': { sw: 'Moja kwa moja sasa', en: 'Live Now' },
  'huddle.participants': { sw: 'Washiriki', en: 'Participants' },
  'huddle.inviteGuest': { sw: 'Alika Daktari Mgeni', en: 'Invite Guest Doctor' },
  'huddle.guestEmail': { sw: 'Barua pepe ya Daktari Mgeni', en: 'Guest Doctor Email' },
  'patient.hospital.allSpecialties': { sw: 'Maeneo Yote', en: 'All Specialties' },
  'patient.hospital.general': { sw: 'Daktari wa Kawaida', en: 'General Practitioner' },
  'patient.hospital.cardiologist': { sw: 'Daktari wa Moyoni', en: 'Cardiologist' },
  'patient.hospital.pediatrician': { sw: 'Daktari wa Watoto', en: 'Pediatrician' },
  'patient.hospital.dermatologist': { sw: 'Daktari wa Ngozi', en: 'Dermatologist' },
  'patient.hospital.psychiatrist': { sw: 'Daktari wa Akili', en: 'Psychiatrist' },
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('sw');

  useEffect(() => {
    const saved = localStorage.getItem('afyaapp-lang') as Lang | null;
    if (saved === 'sw' || saved === 'en') setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('afyaapp-lang', l);
  }

  function t(key: string): string {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang];
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
