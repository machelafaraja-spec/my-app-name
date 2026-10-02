import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Clock,
  ScreenShare, MessageSquare, Signal, Send, Image as ImageIcon,
  X, PanelRightClose, PanelRight, Wifi
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Consultation, Profile, ConsultationMessage } from '@/types';
import { Spinner } from './ui';
import { useLang } from '@/lib/i18n';
import { fetchWebRTCToken, getLocalStream, type WebRTCProvider } from '@/lib/webrtc';
import { triggerIncomingCallNotification } from '@/lib/push-notifications';

interface TelehealthCallProps {
  consultation: Consultation;
  profile: Profile;
  onEnd: () => void;
}

export function TelehealthCall({ consultation, profile, onEnd }: TelehealthCallProps) {
  const { t } = useLang();
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'ended'>('connecting');
  const [videoOn, setVideoOn] = useState(consultation.channel === 'video');
  const [micOn, setMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [webrtcProvider, setWebrtcProvider] = useState<WebRTCProvider>('local');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isDoctor = profile.role === 'doctor';
  const otherName = isDoctor ? consultation.patient_name : consultation.doctor_name;

  const startCall = useCallback(async () => {
    try {
      // Fetch WebRTC token from edge function (falls back to 'local' if unavailable)
      const tokenRes = await fetchWebRTCToken(consultation.id, isDoctor ? 'callee' : 'caller');
      setWebrtcProvider(tokenRes.provider);

      // Create call room record in Supabase
      await supabase.from('call_rooms').insert({
        consultation_id: consultation.id,
        room_id: tokenRes.room_id,
        provider: tokenRes.provider,
        status: 'active',
        caller_token: tokenRes.token || null,
        caller_joined: !isDoctor,
        callee_joined: isDoctor,
      });

      // Trigger push notification to the other party
      const recipientId = isDoctor ? consultation.patient_id : consultation.doctor_id;
      if (recipientId) {
        triggerIncomingCallNotification(
          consultation.id,
          recipientId,
          isDoctor ? consultation.patient_name : consultation.doctor_name,
          consultation.channel
        );
      }

      // Get local media stream (used for both local and production WebRTC)
      const stream = await getLocalStream(consultation.channel === 'video');
      streamRef.current = stream;
      if (localVideoRef.current && consultation.channel === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      setCallStatus('active');
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      setCallStatus('active');
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
  }, [consultation.id, consultation.channel, isDoctor, consultation.patient_id, consultation.doctor_id, consultation.patient_name, consultation.doctor_name]);

  useEffect(() => {
    startCall();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, [startCall]);

  // Load chat messages
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', consultation.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as ConsultationMessage[]);
    }
    loadMessages();
  }, [consultation.id]);

  // Real-time subscription for chat messages
  useEffect(() => {
    const channel = supabase
      .channel(`call_chat_${consultation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultation_messages', filter: `consultation_id=eq.${consultation.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ConsultationMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [consultation.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function toggleVideo() {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoOn;
        setVideoOn(!videoOn);
      }
    }
  }

  function toggleMic() {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  }

  async function endCall() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
    }
    // Update call room status to ended
    await supabase.from('call_rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('consultation_id', consultation.id);
    setCallStatus('ended');
    onEnd();
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    const msg = newMessage.trim();
    setNewMessage('');

    const { data } = await supabase.from('consultation_messages').insert({
      consultation_id: consultation.id,
      sender_id: profile.id,
      sender_name: profile.name,
      sender_role: isDoctor ? 'doctor' : 'patient',
      message: msg,
      attachment_url: null,
      attachment_type: null,
    }).select('*').single();

    if (data) {
      setMessages((prev) => [...prev, data as ConsultationMessage]);
    }
    setSendingMsg(false);
  }

  async function sendImage(file: File) {
    setSendingMsg(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const { data } = await supabase.from('consultation_messages').insert({
        consultation_id: consultation.id,
        sender_id: profile.id,
        sender_name: profile.name,
        sender_role: isDoctor ? 'doctor' : 'patient',
        message: null,
        attachment_url: base64,
        attachment_type: 'image',
      }).select('*').single();

      if (data) {
        setMessages((prev) => [...prev, data as ConsultationMessage]);
      }
      setSendingMsg(false);
    };
    reader.readAsDataURL(file);
  }

  function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  const channelLabel = consultation.channel === 'video' ? t('call.videoCall') : consultation.channel === 'voice' ? t('call.voiceCall') : t('call.chat');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-fade-in">
      <div className="flex-1 relative flex overflow-hidden">
        {/* Video / avatar area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-800 to-emerald-900" />

          {/* Connection quality + provider badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <Signal size={14} className="text-green-400" />
              <span className="text-xs text-white font-medium">
                {callStatus === 'connecting' ? t('call.connecting') : t('call.connected')}
              </span>
            </div>
            {webrtcProvider !== 'local' && (
              <div className="flex items-center gap-1 bg-emerald-500/20 backdrop-blur-sm rounded-lg px-2 py-1">
                <Wifi size={12} className="text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium capitalize">{webrtcProvider}</span>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <Clock size={14} className="text-white" />
            <span className="text-xs text-white font-mono font-medium">
              {callStatus === 'active' ? formatDuration(callDuration) : '00:00'}
            </span>
          </div>

          {/* Remote participant */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm border-4 border-white/20 flex items-center justify-center text-white text-5xl font-bold">
              {otherName.charAt(0)}
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold">{otherName}</p>
              <p className="text-white/60 text-sm">{channelLabel}</p>
            </div>
            {callStatus === 'connecting' && (
              <div className="flex items-center gap-2 text-white/80">
                <Spinner size={20} />
                <span className="text-sm">{t('call.ringing')}</span>
              </div>
            )}
          </div>

          {/* Local video PIP */}
          {consultation.channel === 'video' && videoOn && callStatus === 'active' && (
            <div className={`absolute bottom-24 ${chatOpen ? 'right-80 sm:right-96' : 'right-4'} w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-slate-800 transition-all`}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover -scale-x-100"
              />
            </div>
          )}
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-72 sm:w-96 bg-slate-800 border-l border-slate-700 flex flex-col animate-slide-in-right">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-slate-300" />
                <span className="text-sm font-semibold text-white">{t('call.chatPanel')}</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-8">
                  {t('call.typeMessage')}
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === profile.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMine ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                        {msg.message && <p className="text-sm">{msg.message}</p>}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img src={msg.attachment_url} alt="attachment" className="rounded-lg max-w-full max-h-40 mt-1" />
                        )}
                        <p className={`text-xs mt-0.5 ${isMine ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {msg.sender_name}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) sendImage(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                  title={t('call.attachImage')}
                >
                  <ImageIcon size={16} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !sendingMsg) sendMessage(); }}
                  placeholder={t('call.typeMessage')}
                  className="flex-1 bg-slate-700 text-white text-sm rounded-xl px-3 py-2 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMsg || !newMessage.trim()}
                  className="w-9 h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center transition-colors flex-shrink-0"
                  title={t('call.send')}
                >
                  {sendingMsg ? <Spinner size={14} /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="bg-slate-950 px-4 py-6 flex items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-900'
          }`}
          title={micOn ? t('call.mute') : t('call.unmute')}
        >
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {consultation.channel === 'video' && (
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-900'
            }`}
            title={videoOn ? t('call.videoOff') : t('call.videoOn')}
          >
            {videoOn ? <Video size={22} /> : <VideoOff size={22} />}
          </button>
        )}

        <button
          onClick={endCall}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg"
          title={t('call.endCall')}
        >
          <PhoneOff size={24} />
        </button>

        {consultation.channel === 'video' && (
          <button
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
            title={t('call.screenShare')}
          >
            <ScreenShare size={22} />
          </button>
        )}

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            chatOpen ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={t('call.chatPanel')}
        >
          {chatOpen ? <PanelRightClose size={22} /> : <PanelRight size={22} />}
          {messages.length > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
              {messages.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
