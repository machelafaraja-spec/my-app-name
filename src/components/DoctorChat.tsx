import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Paperclip, Image, Video, Phone, PhoneOff, Video as VideoIcon,
  User, Stethoscope, X, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Consultation, ConsultationMessage, Profile } from '@/types';
import { Spinner, Badge } from './ui';

interface DoctorChatProps {
  consultation: Consultation;
  profile: Profile;
  onVoiceCall: () => void;
  onVideoCall: () => void;
}

export function DoctorChat({ consultation, profile, onVoiceCall, onVideoCall }: DoctorChatProps) {
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDoctor = profile.role === 'doctor';
  const otherName = isDoctor ? consultation.patient_name : consultation.doctor_name;
  const otherRole = isDoctor ? 'patient' : 'doctor';

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('consultation_messages')
      .select('*')
      .eq('consultation_id', consultation.id)
      .order('created_at', { ascending: true });
    setMessages((data as ConsultationMessage[]) || []);
    setLoading(false);
  }, [consultation.id]);

  useEffect(() => {
    loadMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`consultation:${consultation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultation_messages', filter: `consultation_id=eq.${consultation.id}` },
        (payload) => {
          const newMsg = payload.new as ConsultationMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation.id, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text?: string, attachmentUrl?: string, attachmentType?: string) {
    const msgText = text ?? input;
    if (!msgText.trim() && !attachmentUrl) return;
    setInput('');
    setSending(true);

    const { data } = await supabase.from('consultation_messages').insert({
      consultation_id: consultation.id,
      sender_id: profile.id,
      sender_name: profile.name,
      sender_role: isDoctor ? 'doctor' : 'patient',
      message: msgText.trim() || null,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
    }).select('*').single();

    if (data) {
      setMessages((prev) => [...prev, data as ConsultationMessage]);
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local preview URL for the image
    const isImage = file.type.startsWith('image/');
    const localUrl = URL.createObjectURL(file);

    if (isImage) {
      sendMessage('', localUrl, 'image');
    } else {
      sendMessage('', localUrl, 'file');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            otherRole === 'doctor' ? 'bg-secondary-100 text-secondary-600' : 'bg-primary-100 text-primary-600'
          }`}>
            {otherRole === 'doctor' ? <Stethoscope size={18} /> : <User size={18} />}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{otherName}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-500" />
              <p className="text-xs text-slate-500">{otherRole === 'doctor' ? 'Daktari yupo mtandaoni' : 'Mgonjwa yupo mtandaoni'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onVoiceCall}
            className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 flex items-center justify-center transition-colors"
            title="Piga simu ya sauti"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={onVideoCall}
            className="w-9 h-9 rounded-xl bg-secondary-50 text-secondary-600 hover:bg-secondary-100 flex items-center justify-center transition-colors"
            title="Piga simu ya video"
          >
            <VideoIcon size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Spinner size={24} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Anza mazungumzo na {otherName}</p>
            <p className="text-xs text-slate-400 mt-1">Tuma ujumbe au piga simu</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === profile.id;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.sender_role === 'doctor' ? 'bg-secondary-100 text-secondary-600' : 'bg-primary-100 text-primary-600'
                }`}>
                  {msg.sender_role === 'doctor' ? <Stethoscope size={14} /> : <User size={14} />}
                </div>
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {msg.attachment_url && msg.attachment_type === 'image' && (
                    <div className={`rounded-2xl overflow-hidden border border-slate-200 ${isOwn ? 'self-end' : 'self-start'}`}>
                      <img src={msg.attachment_url} alt="attachment" className="max-w-full max-h-48 object-cover" />
                    </div>
                  )}
                  {msg.attachment_url && msg.attachment_type === 'file' && (
                    <a href={msg.attachment_url} download className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm border border-slate-200 ${
                      isOwn ? 'bg-primary-600 text-white' : 'bg-white text-slate-700'
                    }`}>
                      <Paperclip size={14} /> Faili
                    </a>
                  )}
                  {msg.message && (
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isOwn
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.message}
                    </div>
                  )}
                  <span className={`text-xs text-slate-400 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
            title="Tumia picha/faili"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Andika ujumbe..."
            className="input flex-1"
            disabled={sending}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="btn-primary !px-3 flex-shrink-0"
          >
            {sending ? <Spinner size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
