import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, CheckCircle2, Clock, PlayCircle, FileEdit, XCircle,
  Microscope, TestTube, Calendar, User, Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, LabTest } from '@/types';
import { Card, StatCard, Badge, Spinner, EmptyState, Modal, SectionHeader } from './ui';

type Tab = 'overview' | 'pending' | 'completed';

export function LabTechView({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState<LabTest | null>(null);
  const [results, setResults] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('lab_tests').select('*').order('created_at', { ascending: false });
    setLabTests((data as LabTest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const ordered = labTests.filter((l) => l.status === 'ordered');
  const inProgress = labTests.filter((l) => l.status === 'in_progress');
  const completed = labTests.filter((l) => l.status === 'completed');

  async function updateStatus(labId: string, status: LabTest['status']) {
    const updates: Record<string, unknown> = { status };
    if (status === 'in_progress') updates.notes = 'Kipimo kinaendelea';
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    const { data } = await supabase.from('lab_tests').update(updates).eq('id', labId).select('*').single();
    if (data) {
      setLabTests((prev) => prev.map((l) => l.id === labId ? data as LabTest : l));
    }
  }

  async function saveResults() {
    if (!selectedLab || !results.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('lab_tests').update({
      status: 'completed',
      results: results.trim(),
      notes: notes.trim() || null,
      completed_at: new Date().toISOString(),
    }).eq('id', selectedLab.id).select('*').single();

    if (data) {
      setLabTests((prev) => prev.map((l) => l.id === selectedLab.id ? data as LabTest : l));
      await supabase.from('health_records').insert({
        patient_id: selectedLab.patient_id || '',
        record_type: 'lab_test',
        title: `Matokeo: ${selectedLab.test_name}`,
        description: results.trim(),
        reference_id: selectedLab.id,
      });
      setSelectedLab(null);
      setResults('');
      setNotes('');
    }
    setSaving(false);
  }

  function openResultsModal(lab: LabTest) {
    setSelectedLab(lab);
    setResults(lab.results || '');
    setNotes(lab.notes || '');
  }

  const tabs: { id: Tab; label: string; icon: typeof FlaskConical }[] = [
    { id: 'overview', label: 'Mwanzo', icon: Activity },
    { id: 'pending', label: 'Vinasisubiri', icon: Clock },
    { id: 'completed', label: 'Vilivyokamilika', icon: CheckCircle2 },
  ];

  function LabCard({ lab }: { lab: LabTest }) {
    return (
      <Card key={lab.id} className="p-4" hover>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0">
            <FlaskConical size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{lab.test_name}</p>
                <p className="text-sm text-slate-500">{lab.patient_name} - {lab.test_category}</p>
                <p className="text-xs text-slate-400 mt-0.5">Daktari: {lab.doctor_name}</p>
              </div>
              {lab.status === 'ordered' && <Badge color="slate" icon={Clock}>Imeagizwa</Badge>}
              {lab.status === 'in_progress' && <Badge color="warning" icon={PlayCircle}>Inafanyika</Badge>}
              {lab.status === 'completed' && <Badge color="success" icon={CheckCircle2}>Imekamilika</Badge>}
            </div>

            {lab.results && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Matokeo:</p>
                <p className="text-sm text-slate-700">{lab.results}</p>
              </div>
            )}
            {lab.notes && !lab.results && (
              <p className="text-xs text-slate-400 mt-1">{lab.notes}</p>
            )}

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={11} /> {new Date(lab.created_at).toLocaleDateString('sw-TZ')}
              {lab.completed_at && <span className="ml-2">- Imekamilika: {new Date(lab.completed_at).toLocaleDateString('sw-TZ')}</span>}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              {lab.status === 'ordered' && (
                <button onClick={() => updateStatus(lab.id, 'in_progress')} className="btn-secondary text-xs flex-1">
                  <PlayCircle size={14} /> Anza Kipimo
                </button>
              )}
              {lab.status === 'in_progress' && (
                <button onClick={() => openResultsModal(lab)} className="btn-primary text-xs flex-1">
                  <FileEdit size={14} /> Andika Matokeo
                </button>
              )}
              {lab.status === 'completed' && (
                <button onClick={() => openResultsModal(lab)} className="btn-ghost text-xs flex-1">
                  <FileEdit size={14} /> Ona Matokeo
                </button>
              )}
              {lab.status !== 'completed' && (
                <button onClick={() => updateStatus(lab.id, 'cancelled' as LabTest['status'])} className="btn-danger text-xs">
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Microscope size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-sm text-primary-100">Mtaalamu wa Maabara - {profile.location || 'Tanzania'}</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20"><Spinner size={32} /></div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <StatCard icon={Clock} label="Vimeagizwa" value={ordered.length} color="warning" />
                <StatCard icon={PlayCircle} label="Vinaendelea" value={inProgress.length} color="accent" />
                <StatCard icon={CheckCircle2} label="Vimekamilika" value={completed.length} color="success" />
              </div>

              <Card className="p-5">
                <SectionHeader title="Vipimo Vinavyosubiri" />
                {ordered.length === 0 && inProgress.length === 0 ? (
                  <EmptyState icon={FlaskConical} title="Hakuna vipimo vinavyosubiri" />
                ) : (
                  <div className="space-y-3">
                    {[...ordered, ...inProgress].slice(0, 5).map((lab) => <LabCard key={lab.id} lab={lab} />)}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'pending' && (
            <div className="space-y-3">
              {ordered.length === 0 && inProgress.length === 0 ? (
                <Card><EmptyState icon={Clock} title="Hakuna vipimo vinavyosubiri" description="Vipodo vipya vitaonekana hapa" /></Card>
              ) : (
                <>
                  {inProgress.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-slate-700 px-1">Inafanyika ({inProgress.length})</p>
                      {inProgress.map((lab) => <LabCard key={lab.id} lab={lab} />)}
                    </>
                  )}
                  {ordered.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-slate-700 px-1 pt-2">Vimeagizwa ({ordered.length})</p>
                      {ordered.map((lab) => <LabCard key={lab.id} lab={lab} />)}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'completed' && (
            <div className="space-y-3">
              {completed.length === 0 ? (
                <Card><EmptyState icon={CheckCircle2} title="Hakuna vipimo vilivyokamilika" /></Card>
              ) : (
                completed.map((lab) => <LabCard key={lab.id} lab={lab} />)
              )}
            </div>
          )}
        </>
      )}

      {/* Results modal */}
      <Modal open={!!selectedLab} onClose={() => setSelectedLab(null)}
        title={selectedLab?.status === 'completed' ? 'Matokeo ya Kipimo' : 'Andika Matokeo'} size="md">
        {selectedLab && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TestTube size={16} className="text-accent-600" />
                <p className="font-semibold text-slate-900">{selectedLab.test_name}</p>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <User size={12} /> {selectedLab.patient_name} - {selectedLab.test_category}
              </p>
              <p className="text-xs text-slate-400 mt-1">Daktari: {selectedLab.doctor_name}</p>
            </div>

            {selectedLab.status !== 'completed' && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(selectedLab.id, 'in_progress')} className="btn-secondary text-xs flex-1">
                  <PlayCircle size={14} /> Anza Kipimo
                </button>
              </div>
            )}

            <div>
              <label className="label">Matokeo ya Kipimo</label>
              <textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                placeholder="Andika matokeo ya kipimo..."
                rows={4}
                className="input resize-none"
                disabled={selectedLab.status === 'completed'}
              />
            </div>

            <div>
              <label className="label">Maelezo ya Ziada</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Maelezo kwa daktari..."
                rows={2}
                className="input resize-none"
                disabled={selectedLab.status === 'completed'}
              />
            </div>

            {selectedLab.status !== 'completed' ? (
              <button onClick={saveResults} disabled={saving || !results.trim()} className="btn-primary w-full">
                {saving ? <Spinner size={18} /> : <CheckCircle2 size={18} />}
                Hifadhi Matokeo
              </button>
            ) : (
              <button onClick={() => setSelectedLab(null)} className="btn-secondary w-full">
                Funga
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
