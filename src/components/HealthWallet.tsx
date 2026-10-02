import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, TrendingUp, TrendingDown, Target, ArrowDownCircle,
  ArrowUpCircle, CheckCircle2, Clock, PiggyBank, Bell, Settings,
  ChevronRight, X, Loader
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, HealthSavingsWallet, HealthSavingsTransaction } from '@/types';
import { Card, Badge, Spinner, EmptyState, Modal, SectionHeader } from './ui';
import { PAYMENT_METHODS } from '@/lib/constants';

interface HealthWalletProps {
  profile: Profile;
  onDepositNeeded?: () => void;
}

export function HealthWallet({ profile }: HealthWalletProps) {
  const [wallet, setWallet] = useState<HealthSavingsWallet | null>(null);
  const [transactions, setTransactions] = useState<HealthSavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showAutoSave, setShowAutoSave] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: w } = await supabase
      .from('health_savings_wallets')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle();

    let wll = w as HealthSavingsWallet | null;
    if (!wll) {
      const { data: nw } = await supabase
        .from('health_savings_wallets')
        .insert({ profile_id: profile.id })
        .select('*')
        .single();
      wll = nw as HealthSavingsWallet;
    }
    setWallet(wll);

    if (wll) {
      const { data: txns } = await supabase
        .from('health_savings_transactions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      setTransactions((txns as HealthSavingsTransaction[]) || []);
    }
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="py-20 flex justify-center"><Spinner size={32} /></div>;
  }

  if (!wallet) {
    return <Card><EmptyState icon={Wallet} title="Pochi haijasajiliwa" /></Card>;
  }

  const goalProgress = wallet.savings_goal && wallet.savings_goal > 0
    ? Math.min(100, (wallet.balance / wallet.savings_goal) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* ── Balance Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <PiggyBank size={18} />
              </div>
              <div>
                <p className="text-emerald-100 text-xs font-semibold">Akiba ya Afya</p>
                <p className="text-xs text-emerald-200">Salio la sasa</p>
              </div>
            </div>
            {wallet.auto_save_enabled && (
              <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-lg">
                <Bell size={11} />
                <span className="text-xs font-semibold">Auto-Save</span>
              </div>
            )}
          </div>
          <p className="text-4xl font-bold mt-3">TSh {Number(wallet.balance).toLocaleString()}</p>
          <button
            onClick={() => setShowDeposit(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-emerald-700 font-bold hover:bg-emerald-50 transition-all active:scale-[0.98] shadow-lg"
          >
            <Plus size={18} /> Weka Akiba
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 border border-slate-200 text-center">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1">
            <TrendingUp size={16} />
          </div>
          <p className="text-xs text-slate-500">Jumla Imewekwa</p>
          <p className="font-bold text-slate-900 text-sm">TSh {Number(wallet.total_saved).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-200 text-center">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-1">
            <TrendingDown size={16} />
          </div>
          <p className="text-xs text-slate-500">Jumla Matumizi</p>
          <p className="font-bold text-slate-900 text-sm">TSh {Number(wallet.total_spent).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-200 text-center">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-1">
            <Target size={16} />
          </div>
          <p className="text-xs text-slate-500">Lengo</p>
          <p className="font-bold text-slate-900 text-sm">{wallet.savings_goal ? `TSh ${Number(wallet.savings_goal).toLocaleString()}` : 'Hakuna'}</p>
        </div>
      </div>

      {/* ── Savings Goal Progress ── */}
      {wallet.savings_goal && wallet.savings_goal > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-amber-600" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">Lengo la Akiba</p>
                {wallet.goal_label && <p className="text-xs text-slate-500">{wallet.goal_label}</p>}
              </div>
            </div>
            <button onClick={() => setShowGoal(true)} className="btn-ghost text-xs text-emerald-600">
              <Settings size={14} /> Hariri
            </button>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">{goalProgress.toFixed(0)}% limekamilika</p>
            <p className="text-xs font-semibold text-slate-700">
              TSh {Number(wallet.balance).toLocaleString()} / TSh {Number(wallet.savings_goal).toLocaleString()}
            </p>
          </div>
        </Card>
      )}

      {/* ── Auto-Save card ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Akiba Otomatiki (Auto-Save)</p>
              <p className="text-xs text-slate-500">
                {wallet.auto_save_enabled
                  ? `TSh ${Number(wallet.auto_save_amount || 0).toLocaleString()} kila mwezi, siku ya ${wallet.auto_save_day}`
                  : 'Washa kuweka akiba kiotomatiki kila mwezi'}
              </p>
            </div>
          </div>
          <button onClick={() => setShowAutoSave(true)} className="btn-ghost text-xs text-emerald-600">
            {wallet.auto_save_enabled ? 'Hariri' : 'Washa'}
          </button>
        </div>
      </Card>

      {/* ── Quick deposit buttons (if no goal) ── */}
      {!wallet.savings_goal && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">Weka Haraka</p>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 50000].map((amt) => (
              <button
                key={amt}
                onClick={() => setShowDeposit(true)}
                className="py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-sm font-bold text-slate-700"
              >
                {amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── Transaction Ledger ── */}
      <Card className="p-5">
        <SectionHeader title="Taarifa ya Akiba (Statement)" subtitle="Historia ya muhamala wote" />
        {transactions.length === 0 ? (
          <EmptyState icon={Wallet} title="Hakuna muhamala bado" description="Weka akiba yako ya kwanza ili kuanza" />
        ) : (
          <div className="space-y-2">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  txn.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' :
                  txn.type === 'deduction' ? 'bg-rose-50 text-rose-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {txn.type === 'deposit' ? <ArrowDownCircle size={18} /> :
                   txn.type === 'deduction' ? <ArrowUpCircle size={18} /> :
                   <Target size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{txn.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge color={txn.type === 'deposit' ? 'success' : txn.type === 'deduction' ? 'error' : 'secondary'}>
                          {txn.type}
                        </Badge>
                        <span className="text-xs text-slate-400">{txn.channel}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${txn.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {txn.type === 'deposit' ? '+' : '-'}TSh {Number(txn.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">Salio: {Number(txn.balance_after).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(txn.created_at).toLocaleString('sw-TZ', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Modals ── */}
      {showDeposit && (
        <DepositModal
          wallet={wallet}
          profile={profile}
          onClose={() => setShowDeposit(false)}
          onSaved={loadData}
        />
      )}
      {showGoal && (
        <GoalModal
          wallet={wallet}
          profile={profile}
          onClose={() => setShowGoal(false)}
          onSaved={loadData}
        />
      )}
      {showAutoSave && (
        <AutoSaveModal
          wallet={wallet}
          profile={profile}
          onClose={() => setShowAutoSave(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

// ── Deposit Modal ──
function DepositModal({ wallet, profile, onClose, onSaved }: {
  wallet: HealthSavingsWallet;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');
  const [channel, setChannel] = useState('mpesa');
  const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');
  const [allMethods] = useState(() => [
    ...PAYMENT_METHODS.mobile,
    ...PAYMENT_METHODS.bank,
  ]);

  const finalAmount = amount || (parseInt(customAmount) || 0);

  async function processDeposit() {
    if (finalAmount < 500) return;
    setStep('processing');
    await new Promise((r) => setTimeout(r, 2000));

    const txnId = `DEP${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const newBalance = Number(wallet.balance) + finalAmount;
    const newTotalSaved = Number(wallet.total_saved) + finalAmount;

    await supabase.from('health_savings_wallets').update({
      balance: newBalance,
      total_saved: newTotalSaved,
      updated_at: new Date().toISOString(),
    }).eq('id', wallet.id);

    await supabase.from('health_savings_transactions').insert({
      wallet_id: wallet.id,
      profile_id: profile.id,
      type: 'deposit',
      amount: finalAmount,
      channel,
      description: `Akiba imeingizwa kupitia ${channel}`,
      balance_after: newBalance,
      transaction_id: txnId,
    });

    setStep('success');
    setTimeout(() => { onClose(); onSaved(); }, 1500);
  }

  return (
    <Modal open onClose={onClose} title="Weka Akiba ya Afya" size="md">
      {step === 'select' && (
        <div className="space-y-4">
          {/* Quick amounts */}
          <div>
            <label className="label">Chagua kiasi</label>
            <div className="grid grid-cols-4 gap-2">
              {[1000, 5000, 10000, 50000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setAmount(amt); setCustomAmount(''); }}
                  className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    amount === amt && !customAmount
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="label">Au kiasi cha kibinafsi</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">TSh</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                placeholder="0"
                min={500}
                className="input pl-12"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Chini ya TSh 500 haiwezekani</p>
          </div>

          {/* Channel selection */}
          <div>
            <label className="label">Njia ya malipo</label>
            <div className="space-y-2">
              {allMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChannel(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    channel === m.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${m.color} ${m.textColor} flex items-center justify-center text-sm font-bold`}>
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.provider}</p>
                  </div>
                  {channel === m.id && <CheckCircle2 size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {finalAmount >= 500 && (
            <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
              <span className="text-sm text-emerald-700 font-semibold">Jumla ya kuweka</span>
              <span className="font-bold text-emerald-800 text-lg">TSh {finalAmount.toLocaleString()}</span>
            </div>
          )}

          <button
            onClick={processDeposit}
            disabled={finalAmount < 500}
            className="btn-primary w-full"
          >
            <PiggyBank size={18} /> Weka TSh {finalAmount.toLocaleString()}
          </button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center py-12">
          <Loader size={40} className="text-emerald-600 animate-spin" />
          <p className="text-slate-600 font-semibold mt-4">Inashughulikia akiba...</p>
          <p className="text-slate-400 text-sm mt-1">Tafadhali subiri</p>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
            <CheckCircle2 size={36} className="text-emerald-600" />
          </div>
          <p className="text-slate-900 font-bold text-lg mt-4">Akiba Imewekwa!</p>
          <p className="text-slate-500 text-sm mt-1">TSh {finalAmount.toLocaleString()} imeongezwa kwenye pochi yako</p>
          <p className="text-xs text-emerald-600 mt-2">Arifa imetumwa kwa simu yako</p>
        </div>
      )}
    </Modal>
  );
}

// ── Goal Modal ──
function GoalModal({ wallet, profile, onClose, onSaved }: {
  wallet: HealthSavingsWallet;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [goal, setGoal] = useState(wallet.savings_goal ? String(wallet.savings_goal) : '');
  const [label, setLabel] = useState(wallet.goal_label || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    const goalNum = parseInt(goal) || 0;
    if (goalNum < 1000) return;
    setSaving(true);

    const isUpdate = wallet.savings_goal !== null;
    await supabase.from('health_savings_wallets').update({
      savings_goal: goalNum,
      goal_label: label || null,
      updated_at: new Date().toISOString(),
    }).eq('id', wallet.id);

    await supabase.from('health_savings_transactions').insert({
      wallet_id: wallet.id,
      profile_id: profile.id,
      type: isUpdate ? 'goal_update' : 'goal_set',
      amount: goalNum,
      channel: 'wallet',
      description: isUpdate ? `Lengo limerekebishwa: ${label || 'Akiba ya Afya'}` : `Lengo jipya: ${label || 'Akiba ya Afya'}`,
      balance_after: Number(wallet.balance),
    });

    setSaving(false);
    onClose();
    onSaved();
  }

  const presets = [
    { amount: 50000, label: 'Dharura ya Familia' },
    { amount: 100000, label: 'Matibabu ya Watoto' },
    { amount: 250000, label: 'Operesheni ya Dharura' },
    { amount: 500000, label: 'Bima ya Afya Nzima' },
  ];

  return (
    <Modal open onClose={onClose} title="Weka Lengo la Akiba" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Lengo la kila mwezi (TSh)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">TSh</span>
            <input
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="50000"
              min={1000}
              className="input pl-12"
            />
          </div>
        </div>

        <div>
          <label className="label">Lengo hili ni la nini?</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mfano: Akiba ya Dharura ya Familia"
            className="input"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2"> Misheni ya haraka</p>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.amount}
                onClick={() => { setGoal(String(p.amount)); setLabel(p.label); }}
                className="p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left"
              >
                <p className="font-bold text-sm text-slate-900">TSh {(p.amount / 1000)}K</p>
                <p className="text-xs text-slate-500">{p.label}</p>
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving || !goal || parseInt(goal) < 1000} className="btn-primary w-full">
          {saving ? <Spinner size={18} /> : <Target size={18} />} Hifadhi Lengo
        </button>
      </div>
    </Modal>
  );
}

// ── Auto-Save Modal ──
function AutoSaveModal({ wallet, profile, onClose, onSaved }: {
  wallet: HealthSavingsWallet;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(wallet.auto_save_enabled);
  const [amount, setAmount] = useState(wallet.auto_save_amount ? String(wallet.auto_save_amount) : '10000');
  const [day, setDay] = useState(wallet.auto_save_day || 1);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from('health_savings_wallets').update({
      auto_save_enabled: enabled,
      auto_save_amount: enabled ? (parseInt(amount) || 0) : null,
      auto_save_day: day,
      updated_at: new Date().toISOString(),
    }).eq('id', wallet.id);

    setSaving(false);
    onClose();
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Akiba Otomatiki" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Washa Auto-Save</p>
              <p className="text-xs text-slate-500">Akiba itaingizwa kiotomatiki kila mwezi</p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {enabled && (
          <>
            <div>
              <label className="label">Kiasi cha kuweka kila mwezi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">TSh</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  min={1000}
                  className="input pl-12"
                />
              </div>
            </div>
            <div>
              <label className="label">Siku ya mwezi kuweka</label>
              <select value={day} onChange={(e) => setDay(parseInt(e.target.value))} className="input">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>Siku ya {d}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? <Spinner size={18} /> : <CheckCircle2 size={18} />} Hifadhi
        </button>
      </div>
    </Modal>
  );
}
