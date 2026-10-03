import { useState, useRef, useCallback } from 'react';
import {
  Mic, Square, Sparkles, FileText, Loader2, CheckCircle2,
  ClipboardList, Activity, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import type { Consultation } from '@/types';
import { Card, Badge, SectionHeader, Spinner } from './ui';

interface AIClinicalScribeProps {
  consultation: Consultation;
  onSave: (soap: { subjective: string; objective: string; assessment: string; plan: string; transcript: string; symptoms: string; duration: string; history: string }) => void;
}

interface TranscriptEntry {
  speaker: 'Daktari' | 'Mgonjwa';
  text: string;
  time: string;
}

const SAMPLE_CONVERSATIONS: TranscriptEntry[][] = [
  [
    { speaker: 'Mgonjwa', text: 'Daktari, nina homa kwa siku tatu sasa. Kichwa kinauma sana na ninashindwa kusika.', time: '00:15' },
    { speaker: 'Daktari', text: 'Homa ni ya aina gani? Una kikohozi pia?', time: '00:22' },
    { speaker: 'Mgonjwa', text: 'Ndio, nina kikohozi kavu. Homa ni ya juu, hasa usiku.', time: '00:30' },
    { speaker: 'Daktari', text: 'Una maumivu ya koo? Ulipata maambukizi ya malaria hivi karibuni?', time: '00:38' },
    { speaker: 'Mgonjwa', text: 'Koo inauma kidogo. Malaria nilipata mwaka jana, lakini sasa la sivyo.', time: '00:45' },
    { speaker: 'Daktari', text: 'Una kutapika? Homa ya juu kama 38 au 39?', time: '00:52' },
    { speaker: 'Mgonjwa', text: 'Sijatapika, lakini nashindwa kula. Homa ni ya juu sana.', time: '01:00' },
    { speaker: 'Daktari', text: 'Sawa. Nitakupima homa na kukupima malaria. Kwa sasa nitakupa Paracetamol.', time: '01:10' },
  ],
  [
    { speaker: 'Mgonjwa', text: 'Daktari, tumbo linauma na ninahara kwa siku mbili sasa.', time: '00:10' },
    { speaker: 'Daktari', text: 'Ni mara ngapi kwa siku? Kuna damu kwenye kinyesi?', time: '00:18' },
    { speaker: 'Mgonjwa', text: 'Mara nne au tano kwa siku. Hakuna damu, lakini kinyesi ni maji maji.', time: '00:28' },
    { speaker: 'Daktari', text: 'Una maumivu ya tumbo kabla au baada ya kula?', time: '00:35' },
    { speaker: 'Mgonjwa', text: 'Maumivu yanakuja wakati wowote. Pia nashindwa kula vizuri.', time: '00:42' },
    { speaker: 'Daktari', text: 'Umelewa maji ya ORS? Una homa pia?', time: '00:50' },
    { speaker: 'Mgonjwa', text: 'Nimelewa ORS lakini bado nahara. Homa kidogo tu.', time: '00:58' },
    { speaker: 'Daktari', text: 'Sawa. Nitakupima kipimo cha kinyesi na kukupa Metronidazole.', time: '01:08' },
  ],
  [
    { speaker: 'Mgonjwa', text: 'Daktari, nashindwa kulala vizuri kwa wiki mbili sasa. Nashindwa kusika.', time: '00:12' },
    { speaker: 'Daktari', text: 'Unalala masaa mangapi kwa usiku? Una msongo wa mawazo?', time: '00:20' },
    { speaker: 'Mgonjwa', text: 'Masaa mawili au matatu tu. Ndio, nina wasiwasi kuhusu kazi.', time: '00:30' },
    { speaker: 'Daktari', text: 'Una hisia za huzuni? Umepoteza hamu ya kula?', time: '00:38' },
    { speaker: 'Mgonjwa', text: 'Kidogo. Sijisikii vizuru, lakini bado nafanya kazi.', time: '00:45' },
    { speaker: 'Daktari', text: 'Una mtu wa kuongea naye kuhusu shida zako?', time: '00:52' },
    { speaker: 'Mgonjwa', text: 'Nina mke, lakini sijamwambia kuhusu hili.', time: '00:58' },
    { speaker: 'Daktari', text: 'Nashauri uongee naye. Nitakupa dawa ya kupunguza wasiwasi kwa muda mfupi.', time: '01:10' },
  ],
];

function extractSOAP(transcript: TranscriptEntry[]) {
  const allText = transcript.map((t) => t.text).join(' ').toLowerCase();

  const symptoms: string[] = [];
  if (allText.includes('homa')) symptoms.push('Homa');
  if (allText.includes('kikohozi')) symptoms.push('Kikohozi');
  if (allText.includes('kichwa') && allText.includes('kinauma')) symptoms.push('Maumivu ya kichwa');
  if (allText.includes('koo') && allText.includes('kinauma')) symptoms.push('Maumivu ya koo');
  if (allText.includes('tumbo') && allText.includes('kinauma')) symptoms.push('Maumivu ya tumbo');
  if (allText.includes('kuhara') || allText.includes('nahara')) symptoms.push('Kuhara');
  if (allText.includes('kutapika')) symptoms.push('Kutapika');
  if (allText.includes('kusingizia') || allText.includes('kulala') || allText.includes('kushindwa kusika')) symptoms.push('Kushindwa kulala/kusika');
  if (allText.includes('wasivuasi') || allText.includes('wasiwasi')) symptoms.push('Wasiwasi');
  if (allText.includes('huzuni')) symptoms.push('Huzuni');
  if (allText.includes('hamu ya kula') || allText.includes('kushindwa kula')) symptoms.push('Kukosa hamu ya kula');

  const durationMatch = transcript.find((t) => t.text.match(/siku|wiki|mwezi|mwaka/));
  const duration = durationMatch
    ? durationMatch.text.match(/siku tatu|siku mbili|wiki mbili|siku nne|siku tano|wiki|siku|mwezi|mwaka/gi)?.[0] || 'Haijatajwa'
    : 'Haijatajwa';

  const history: string[] = [];
  if (allText.includes('malaria') && allText.includes('mwaka')) history.push('Historia ya malaria');
  if (allText.includes('ors')) history.push('Ametumia ORS');
  if (allText.includes('mke')) history.push('Ameolewa');

  const subjective = `Mgonjwa anaripoti: ${symptoms.join(', ')}. Kwa muda wa ${duration}. ${history.length > 0 ? `Historia: ${history.join('; ')}.` : ''}`;

  const objective = `Homa: ${allText.includes('homa ya juu') ? 'Juu (38°C+)' : allText.includes('homa kidogo') ? 'Kidogo' : 'Haijapimwa'}. Koo: ${allText.includes('koo') ? 'Yanauma' : 'Tayari'}. Kinyesi: ${allText.includes('maji') ? 'Maji-maji' : 'Kawaida'}. Hali ya ujumla: ${allText.includes('kushindwa kula') ? 'Dhaifu' : 'Imara'}.`;

  let assessment = '';
  if (allText.includes('homa') && allText.includes('kikohozi') && allText.includes('koo')) {
    assessment = 'Maambukizi ya juu ya njia ya hewa (Acute URI) - ICD-10: J06.9. Funga kukuza malaria.';
  } else if (allText.includes('kuhara') || allText.includes('nahara')) {
    assessment = 'Gastroenteritis ya kuambukiza - ICD-10: A09. Funga kipimo cha kinyesi.';
  } else if (allText.includes('kulala') || allText.includes('wasiwasi') || allText.includes('huzuni')) {
    assessment = 'Wasiwasi na shida ya usingizi - ICD-10: F41.1. Funga ufuatiliaji wa afya ya akili.';
  } else {
    assessment = 'Uchunguzi unaendelea. Subiri matokeo ya vipimo.';
  }

  const plans: string[] = [];
  if (allText.includes('paracetamol')) plans.push('Paracetamol 500mg PO TID x 5 days');
  if (allText.includes('metronidazole')) plans.push('Metronidazole 400mg PO TID x 5 days');
  if (allText.includes('ors')) plans.push('Endelea kunywa ORS');
  if (allText.includes('malaria') && allText.includes('pima')) plans.push('Kipimo cha malaria (mRDT)');
  if (allText.includes('kinyesi') && allText.includes('pima')) plans.push('Kipimo cha kinyesi');
  if (allText.includes('dawa ya kupunguza wasiwasi')) plans.push('Anxiolytic (muda mfupi) + ushauri');
  if (allText.includes('ongea')) plans.push('Ushauri wa kisaikolojia');
  if (plans.length === 0) plans.push('Ufuatiliaji wa dalili');

  return {
    subjective,
    objective,
    assessment,
    plan: plans.join('. ') + '.',
    symptoms: symptoms.join(', '),
    duration,
    history: history.join('; '),
  };
}

export function AIClinicalScribe({ consultation, onSave }: AIClinicalScribeProps) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [soap, setSoap] = useState<{ subjective: string; objective: string; assessment: string; plan: string; symptoms: string; duration: string; history: string } | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const sampleConversation = SAMPLE_CONVERSATIONS[Math.floor(Math.random() * SAMPLE_CONVERSATIONS.length)];

  const startRecording = useCallback(() => {
    setRecording(true);
    setTranscript([]);
    setSoap(null);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    // Simulate live transcription by adding entries one by one
    sampleConversation.forEach((entry, i) => {
      setTimeout(() => {
        setTranscript((prev) => [...prev, entry]);
      }, (i + 1) * 2500);
    });
  }, [sampleConversation]);

  function stopAndAnalyze() {
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAnalyzing(true);

    setTimeout(() => {
      const fullTranscript = transcript.length > 0 ? transcript : sampleConversation;
      const result = extractSOAP(fullTranscript);
      setSoap(result);
      setAnalyzing(false);
    }, 2000);
  }

  function resetScribe() {
    setTranscript([]);
    setSoap(null);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  if (transcriptEndRef.current) {
    transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="space-y-4">
      {/* Scribe control panel */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-700 text-white flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">AI Clinical Scribe</h3>
              <p className="text-xs text-slate-500">Inasikiliza na kuandika mazungumzo</p>
            </div>
          </div>
          {recording && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-error-500 animate-pulse" />
              <span className="text-sm font-mono font-semibold text-error-600">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        {!recording && !soap && !analyzing && transcript.length === 0 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-secondary-50 text-secondary-600 flex items-center justify-center mx-auto mb-3">
              <Mic size={28} />
            </div>
            <p className="text-slate-600 font-medium mb-1">Anza Kurekodi Mazungumzo</p>
            <p className="text-xs text-slate-400 mb-4">AI itasikiliza na kuandika mazungumzo yako na mgonjwa</p>
            <button onClick={startRecording} className="btn-primary">
              <Mic size={18} /> Anza Kurekodi
            </button>
          </div>
        )}

        {recording && (
          <div className="text-center">
            <button onClick={stopAndAnalyze} className="btn-danger">
              <Square size={18} /> Sitisha na Chambua
            </button>
            <p className="text-xs text-slate-400 mt-3">AI inasikiliza mazungumzo...</p>
          </div>
        )}

        {analyzing && (
          <div className="text-center py-6">
            <Loader2 size={32} className="text-secondary-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">AI inachambua mazungumzo...</p>
            <p className="text-xs text-slate-400 mt-1">Inatengeneza SOAP notes</p>
          </div>
        )}

        {soap && (
          <div className="flex gap-2">
            <button onClick={() => onSave({ ...soap, transcript: transcript.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n') })} className="btn-primary flex-1">
              <CheckCircle2 size={18} /> Hifadhi kwenye Mazungumzo
            </button>
            <button onClick={resetScribe} className="btn-secondary">
              <RefreshCw size={16} /> Anza Upya
            </button>
          </div>
        )}
      </Card>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-slate-400" />
            <h4 className="font-semibold text-slate-700 text-sm">Nakala ya Mazungumzo (Transcript)</h4>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2.5">
            {transcript.map((entry, i) => (
              <div key={i} className={`flex gap-2 ${entry.speaker === 'Daktari' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  entry.speaker === 'Daktari' ? 'bg-secondary-100 text-secondary-600' : 'bg-primary-100 text-primary-600'
                }`}>
                  {entry.speaker.charAt(0)}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  entry.speaker === 'Daktari' ? 'bg-secondary-50 text-slate-700' : 'bg-slate-50 text-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-slate-500">{entry.speaker}</span>
                    <span className="text-xs text-slate-400">{entry.time}</span>
                  </div>
                  {entry.text}
                </div>
              </div>
            ))}
            {recording && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                </div>
                <div className="bg-slate-100 rounded-xl px-3 py-2 text-sm text-slate-400 italic">
                  Inasikiliza...
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </Card>
      )}

      {/* AI Extracted Summary */}
      {soap && (
        <>
          <Card className="p-5 border-2 border-secondary-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-secondary-100 text-secondary-600 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <h4 className="font-bold text-slate-900">Muhtasari wa AI</h4>
              <Badge color="secondary" icon={Sparkles}>AI Generated</Badge>
            </div>

            {/* Extracted symptoms */}
            <div className="space-y-3">
              <div className="p-3 bg-error-50 rounded-xl border border-error-100">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={14} className="text-error-600" />
                  <p className="text-xs font-semibold text-error-700">Dalili Zilizotolewa</p>
                </div>
                <p className="text-sm text-slate-700">{soap.symptoms}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-slate-500" />
                    <p className="text-xs font-semibold text-slate-600">Muda wa Dalili</p>
                  </div>
                  <p className="text-sm text-slate-700">{soap.duration}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} className="text-slate-500" />
                    <p className="text-xs font-semibold text-slate-600">Historia ya Matibabu</p>
                  </div>
                  <p className="text-sm text-slate-700">{soap.history || 'Hakuna historia iliyotajwa'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* SOAP Notes */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-secondary-600" />
              <h4 className="font-bold text-slate-900">SOAP Notes</h4>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-1">S - Subjective</p>
                <p className="text-sm text-slate-700">{soap.subjective}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                <p className="text-xs font-bold text-primary-700 mb-1">O - Objective</p>
                <p className="text-sm text-slate-700">{soap.objective}</p>
              </div>
              <div className="p-3 bg-accent-50 rounded-xl border border-accent-100">
                <p className="text-xs font-bold text-accent-700 mb-1">A - Assessment</p>
                <p className="text-sm text-slate-700">{soap.assessment}</p>
              </div>
              <div className="p-3 bg-success-50 rounded-xl border border-success-100">
                <p className="text-xs font-bold text-success-700 mb-1">P - Plan</p>
                <p className="text-sm text-slate-700">{soap.plan}</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
