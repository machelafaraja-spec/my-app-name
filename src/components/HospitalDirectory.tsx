import { useState, useEffect, useCallback } from 'react';
import {
  Building2, MapPin, Phone, Mail, Search, ChevronDown, ChevronUp,
  Navigation, CheckCircle2, Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Hospital } from '@/types';
import { Card, Badge, Spinner, EmptyState } from './ui';

const LEVEL_LABELS: Record<string, { sw: string; en: string }> = {
  primary: { sw: 'Kituo cha Afya', en: 'Primary' },
  secondary: { sw: 'Hospitali ya Mkoa', en: 'Secondary' },
  tertiary: { sw: 'Hospitali ya Rufaa', en: 'Tertiary' },
};

export function HospitalDirectory() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('hospitals').select('*').eq('status', 'verified').order('name');
    setHospitals((data as Hospital[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = hospitals.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.physical_address || '').toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || h.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <Card className="p-4">
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta hospitali kwa jina au eneo..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Zote' },
            { id: 'tertiary', label: 'Ya Rufaa' },
            { id: 'secondary', label: 'Ya Mkoa' },
            { id: 'primary', label: 'Kituo' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setLevelFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                levelFilter === f.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Building2} title="Hakuna hospitali zilizopatikana" description="Badilisha maneno ya utafutaji" /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((hosp) => {
            const isExpanded = expandedId === hosp.id;
            const levelCfg = LEVEL_LABELS[hosp.level] || LEVEL_LABELS.primary;

            return (
              <Card key={hosp.id} className="overflow-hidden">
                {/* Hospital header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : hosp.id)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center flex-shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900">{hosp.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge color="primary">{levelCfg.sw}</Badge>
                            <Badge color="success" icon={CheckCircle2}>Imethibitishwa</Badge>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                        {hosp.physical_address && <span className="flex items-center gap-1"><MapPin size={12} />{hosp.physical_address}</span>}
                        {hosp.phone && <span className="flex items-center gap-1"><Phone size={12} />{hosp.phone}</span>}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded: contact info only — internal units restricted to hospital staff */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 animate-slide-up">
                    {/* Restricted notice */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs mb-3">
                      <Shield size={14} className="flex-shrink-0" />
                      <span>Idara za ndani zinapatikana kwa wafanyakazi wa hospitali tu</span>
                    </div>

                    {/* Contact channels */}
                    <div className="flex flex-wrap gap-2">
                      {hosp.phone && (
                        <a href={`tel:${hosp.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-50 text-success-700 text-xs font-semibold hover:bg-success-100 transition-colors">
                          <Phone size={12} /> Piga Simu
                        </a>
                      )}
                      {hosp.email && (
                        <a href={`mailto:${hosp.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-50 text-secondary-700 text-xs font-semibold hover:bg-secondary-100 transition-colors">
                          <Mail size={12} /> Tuma Barua-pepe
                        </a>
                      )}
                      {hosp.latitude && hosp.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${hosp.latitude},${hosp.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold hover:bg-primary-100 transition-colors"
                        >
                          <Navigation size={12} /> Ramani
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
