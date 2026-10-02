import { QRCodeCanvas } from 'qrcode.react';
import { Download, CheckCircle2, XCircle, Clock, Package } from 'lucide-react';
import { Badge } from './ui';
import type { Prescription, PrescriptionMedication, PharmacyOrder } from '@/types';

export function PrescriptionQR({ prescription, medications }: { prescription: Prescription; medications: PrescriptionMedication[] }) {
  const qrData = JSON.stringify({
    id: prescription.id,
    patient: prescription.patient_name,
    doctor: prescription.doctor_name,
    icd10: prescription.icd10_code,
    diagnosis: prescription.diagnosis,
    meds: medications.map((m) => `${m.medication_name} ${m.dosage} - ${m.frequency} x ${m.duration}`),
    date: prescription.created_at,
    token: prescription.qr_code_data,
  });

  function downloadQR() {
    const canvas = document.getElementById(`qr-${prescription.id}`) as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `prescription-${prescription.icd10_code}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
      <div className="p-3 bg-white rounded-xl border-2 border-primary-200">
        <QRCodeCanvas
          id={`qr-${prescription.id}`}
          value={qrData}
          size={180}
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500">Msimbo wa Uhakiki</p>
        <p className="font-mono text-sm font-bold text-primary-700">{prescription.qr_code_data}</p>
      </div>
      <button onClick={downloadQR} className="btn-secondary text-xs">
        <Download size={14} />
        Pakua QR Code
      </button>
    </div>
  );
}

export function PrescriptionStatusBadge({ status }: { status: Prescription['status'] }) {
  if (status === 'active') return <Badge color="success" icon={Clock}>Inatumika</Badge>;
  if (status === 'filled') return <Badge color="primary" icon={CheckCircle2}>Imejazwa</Badge>;
  return <Badge color="error" icon={XCircle}>Imefutwa</Badge>;
}

export function PharmacyOrderStatusBadge({ status }: { status: PharmacyOrder['status'] }) {
  const map: Record<string, { color: 'slate' | 'warning' | 'secondary' | 'success' | 'primary' | 'error'; label: string }> = {
    pending: { color: 'slate', label: 'Inasubiri' },
    preparing: { color: 'warning', label: 'Inaandaliwa' },
    ready: { color: 'secondary', label: 'Iko Tayari' },
    delivered: { color: 'success', label: 'Imefikishwa' },
    picked_up: { color: 'success', label: 'Imechukuliwa' },
    cancelled: { color: 'error', label: 'Imefutwa' },
  };
  const cfg = map[status] || map.pending;
  return <Badge color={cfg.color} icon={Package}>{cfg.label}</Badge>;
}
