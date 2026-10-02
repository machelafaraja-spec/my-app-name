import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Heart, Shield, Phone, MapPin, Droplet, Calendar, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import type { Profile } from '@/types';

export function PatientIdCard({ profile }: { profile: Profile }) {
  const [showBack, setShowBack] = useState(false);

  const patientId = profile.patient_id_number || 'AFYA-2026-XXXX';
  const qrData = JSON.stringify({
    patient_id: patientId,
    name: profile.name,
    blood_type: profile.blood_type,
    nida: profile.nida_number,
    phone: profile.phone,
  });

  function downloadCard() {
    const canvas = document.querySelector('#patient-id-qr') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${patientId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  return (
    <div className="space-y-3">
      {/* Flip card */}
      <div
        className="relative cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setShowBack(!showBack)}
      >
        <div
          className="relative transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="rounded-3xl overflow-hidden shadow-xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Heart size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-none">AfyaApp</p>
                    <p className="text-xs text-emerald-200 leading-none mt-0.5">Tanzania Digital Health</p>
                  </div>
                </div>
                {profile.id_verified ? (
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
                    <Shield size={12} />
                    <span className="text-xs font-semibold">Imethibitishwa</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-amber-500/30 px-2 py-1 rounded-lg">
                    <AlertCircle size={12} />
                    <span className="text-xs font-semibold">Haijathibitishwa</span>
                  </div>
                )}
              </div>

              {/* Patient info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {profile.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight">{profile.name}</h3>
                  <p className="font-mono text-sm text-emerald-200 mt-0.5">{patientId}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-emerald-100">
                    {profile.blood_type && <span className="flex items-center gap-1"><Droplet size={10} />{profile.blood_type}</span>}
                    {profile.phone && <span className="flex items-center gap-1"><Phone size={10} />{profile.phone}</span>}
                    {profile.location && <span className="flex items-center gap-1"><MapPin size={10} />{profile.location}</span>}
                  </div>
                </div>
              </div>

              {/* QR + NIDA */}
              <div className="flex items-center gap-3 mt-4 bg-white/10 rounded-2xl p-3">
                <div className="bg-white rounded-xl p-1.5 flex-shrink-0">
                  <QRCodeCanvas id="patient-id-qr" value={qrData} size={64} level="M" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-200 font-semibold uppercase tracking-wide">Kitambulisho</p>
                  <p className="text-sm font-mono mt-0.5">
                    NIDA: {profile.nida_number || 'Haijasajiliwa'}
                  </p>
                  <p className="text-xs text-emerald-100 mt-1">
                    {profile.date_of_birth && `Kuzaliwa: ${profile.date_of_birth}`}
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-emerald-200 mt-3">Bonyeza kugeuza kadi</p>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="bg-gradient-to-br from-teal-700 via-emerald-700 to-emerald-800 p-5 text-white h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Maelezo ya Dharura</h3>
                <Heart size={16} />
              </div>
              <div className="space-y-3">
                {profile.blood_type && (
                  <div className="flex items-center gap-2">
                    <Droplet size={16} className="text-red-300" />
                    <span className="text-sm">Kundi la Damu: <strong>{profile.blood_type}</strong></span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-emerald-200" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-200" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                )}
                {profile.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-200" />
                    <span className="text-sm">{profile.date_of_birth}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs text-emerald-200">Skani QR code kwenye sehemu ya mbele kwa maelezo yote ya kitambulisho</p>
                </div>
              </div>
              <p className="text-center text-xs text-emerald-200 mt-4">Bonyeza kurudi mbele</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download button */}
      <button onClick={downloadCard} className="btn-secondary w-full text-sm">
        <Download size={16} /> Pakua QR Code
      </button>
    </div>
  );
}
