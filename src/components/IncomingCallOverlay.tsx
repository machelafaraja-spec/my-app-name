import { useState, useEffect, useRef } from 'react';
import { Phone, Video, X, User, PhoneOff } from 'lucide-react';
import type { Consultation } from '@/types';

interface IncomingCallOverlayProps {
  consultation: Consultation;
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallOverlay({ consultation, callerName, onAccept, onDecline }: IncomingCallOverlayProps) {
  const [ringing, setRinging] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isVideo = consultation.channel === 'video';

  // Vibration API for mobile devices
  useEffect(() => {
    if ('vibrate' in navigator && ringing) {
      const pattern = [0, 500, 200, 500, 200, 500];
      const interval = setInterval(() => {
        navigator.vibrate(pattern);
      }, 1700);
      return () => {
        clearInterval(interval);
        navigator.vibrate(0);
      };
    }
  }, [ringing]);

  // Ringtone audio (generated via Web Audio API — no external file needed)
  useEffect(() => {
    if (!ringing) return;
    let audioCtx: AudioContext | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      };
      playTone();
      interval = setInterval(playTone, 1700);
    } catch {
      // AudioContext not available — silent fallback
    }

    return () => {
      if (interval) clearInterval(interval);
      if (audioCtx) audioCtx.close();
    };
  }, [ringing]);

  function handleAccept() {
    setRinging(false);
    onAccept();
  }

  function handleDecline() {
    setRinging(false);
    onDecline();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
      {/* Caller avatar with pulsing ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
          {callerName.charAt(0)}
        </div>
      </div>

      {/* Caller info */}
      <div className="text-center mb-2">
        <p className="text-white text-2xl font-bold">{callerName}</p>
        <p className="text-emerald-300 text-sm mt-1 flex items-center justify-center gap-1.5">
          {isVideo ? <Video size={14} /> : <Phone size={14} />}
          Incoming {isVideo ? 'Video' : 'Voice'} Call
        </p>
      </div>

      {/* Call reason */}
      {consultation.reason && (
        <p className="text-slate-400 text-sm mt-2 max-w-xs text-center">{consultation.reason}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-8 mt-12">
        <button
          onClick={handleDecline}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 group-hover:scale-110">
            <PhoneOff size={28} />
          </div>
          <span className="text-red-300 text-sm font-semibold">Decline</span>
        </button>

        <button
          onClick={handleAccept}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 group-hover:scale-110 animate-bounce">
            {isVideo ? <Video size={28} /> : <Phone size={28} />}
          </div>
          <span className="text-emerald-300 text-sm font-semibold">Accept</span>
        </button>
      </div>

      {/* Hidden audio element for accessibility */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
