import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader, Shield, Smartphone, Building2, CreditCard, ChevronRight, PiggyBank, Wallet, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal, Spinner } from './ui';
import { PAYMENT_METHODS } from '@/lib/constants';
import type { Profile, HealthSavingsWallet } from '@/types';

interface PaymentCheckoutProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  onPaymentComplete: (method: string, transactionId: string) => void;
  profile?: Profile;
  onWalletDeducted?: (amount: number) => void;
}

type PaymentCategory = 'mobile' | 'bank' | 'card';
type CheckoutMode = 'savings' | 'hybrid' | 'external';

export function PaymentCheckout({ open, onClose, amount, description, onPaymentComplete, profile, onWalletDeducted }: PaymentCheckoutProps) {
  const [category, setCategory] = useState<PaymentCategory>('mobile');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'details' | 'processing' | 'success'>('select');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [wallet, setWallet] = useState<HealthSavingsWallet | null>(null);
  const [mode, setMode] = useState<CheckoutMode>('external');
  const [hybridExternalAmount, setHybridExternalAmount] = useState(0);

  useEffect(() => {
    if (open && profile) {
      setStep('select');
      setSelectedMethod(null);
      setMode('external');
      setHybridExternalAmount(0);
      supabase
        .from('health_savings_wallets')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle()
        .then(({ data }) => {
          setWallet(data as HealthSavingsWallet | null);
        });
    }
  }, [open, profile]);

  const walletBalance = wallet ? Number(wallet.balance) : 0;
  const canPayFromSavings = walletBalance >= amount && walletBalance > 0;
  const canPayHybrid = walletBalance > 0 && walletBalance < amount;
  const savingsPortion = mode === 'savings' ? amount : mode === 'hybrid' ? walletBalance : 0;
  const externalPortion = mode === 'savings' ? 0 : mode === 'hybrid' ? amount - walletBalance : amount;

  function reset() {
    setStep('select');
    setSelectedMethod(null);
    setPhoneNumber('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setAccountNumber('');
    setMode('external');
    setHybridExternalAmount(0);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function selectMethod(id: string) {
    setSelectedMethod(id);
    setStep('details');
  }

  async function deductFromWallet(deductAmount: number): Promise<string | null> {
    if (!wallet || !profile) return null;
    const newBalance = Number(wallet.balance) - deductAmount;
    const newTotalSpent = Number(wallet.total_spent) + deductAmount;
    const txnId = `WAL${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    await supabase.from('health_savings_wallets').update({
      balance: newBalance,
      total_spent: newTotalSpent,
      updated_at: new Date().toISOString(),
    }).eq('id', wallet.id);

    await supabase.from('health_savings_transactions').insert({
      wallet_id: wallet.id,
      profile_id: profile.id,
      type: 'deduction',
      amount: deductAmount,
      channel: mode === 'hybrid' ? 'hybrid' : 'wallet',
      description: `Malipo: ${description}`,
      balance_after: newBalance,
      transaction_id: txnId,
    });

    if (onWalletDeducted) onWalletDeducted(deductAmount);
    return txnId;
  }

  async function processPayment() {
    setStep('processing');
    await new Promise((r) => setTimeout(r, 2000));

    let txnId = `TXN${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    if (mode === 'savings') {
      const walTxn = await deductFromWallet(amount);
      if (walTxn) txnId = walTxn;
    } else if (mode === 'hybrid') {
      await deductFromWallet(walletBalance);
      // External portion already simulated above
    }

    setStep('success');
    setTimeout(() => {
      onPaymentComplete(mode === 'savings' ? 'savings' : (selectedMethod || 'unknown'), txnId);
      reset();
    }, 1500);
  }

  const methods = PAYMENT_METHODS[category];
  const selectedMethodData = [...PAYMENT_METHODS.mobile, ...PAYMENT_METHODS.bank, ...PAYMENT_METHODS.card].find((m) => m.id === selectedMethod);
  const canSubmit = mode === 'savings' ? true :
    mode === 'hybrid' ? (category === 'mobile' ? phoneNumber.length >= 9 : category === 'card' ? cardNumber.length >= 16 && cardCvv.length >= 3 : accountNumber.length >= 5) :
    (category === 'mobile' ? phoneNumber.length >= 9 : category === 'card' ? cardNumber.length >= 16 && cardCvv.length >= 3 : accountNumber.length >= 5);

  return (
    <Modal open={open} onClose={handleClose} title="Malipo (Checkout)" size="md">
      <div className="space-y-4">
        {/* Amount summary */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-4 text-white">
          <p className="text-emerald-100 text-sm">Kiasi cha kulipa</p>
          <p className="text-3xl font-bold mt-1">TSh {amount.toLocaleString()}</p>
          <p className="text-emerald-200 text-xs mt-2">{description}</p>
        </div>

        {/* ── Savings option (only if profile provided and wallet has balance) ── */}
        {profile && wallet && walletBalance > 0 && step === 'select' && (
          <div className="space-y-2">
            {/* Pay full from savings */}
            {canPayFromSavings && (
              <button
                onClick={() => { setMode('savings'); setStep('details'); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <PiggyBank size={22} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">Lipa kutoka Akiba ya Afya</p>
                  <p className="text-xs text-emerald-700">Salio: TSh {walletBalance.toLocaleString()}</p>
                </div>
                <ChevronRight size={18} className="text-emerald-600" />
              </button>
            )}

            {/* Hybrid payment */}
            {canPayHybrid && (
              <button
                onClick={() => { setMode('hybrid'); setStep('details'); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Wallet size={22} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">Malipo Mseto (Hybrid)</p>
                  <p className="text-xs text-amber-700">
                    TSh {walletBalance.toLocaleString()} kutoka Akiba + TSh {(amount - walletBalance).toLocaleString()} kutoka M-Pesa/Benki
                  </p>
                </div>
                <ChevronRight size={18} className="text-amber-600" />
              </button>
            )}

            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-semibold">au lipa kwa njia nyingine</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>
        )}

        {/* ── Savings details step ── */}
        {step === 'details' && mode === 'savings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <PiggyBank size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Malipo kutoka Akiba ya Afya</p>
                <p className="text-xs text-emerald-700">Salio baada ya malipo: TSh {(walletBalance - amount).toLocaleString()}</p>
              </div>
            </div>
            <button onClick={processPayment} className="btn-primary w-full">
              Lipa TSh {amount.toLocaleString()} kutoka Akiba
            </button>
            <button onClick={() => setStep('select')} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">
              Rudi
            </button>
          </div>
        )}

        {/* ── Hybrid details step ── */}
        {step === 'details' && mode === 'hybrid' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-800 flex items-center gap-1.5"><PiggyBank size={14} /> Kutoka Akiba</span>
                <span className="font-bold text-amber-900">TSh {walletBalance.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-1.5"><CreditCard size={14} /> Kutoka {selectedMethodData?.name || 'Njia ya malipo'}</span>
                <span className="font-bold text-slate-900">TSh {(amount - walletBalance).toLocaleString()}</span>
              </div>
              <div className="border-t border-amber-200 pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Jumla</span>
                <span className="font-bold text-slate-900">TSh {amount.toLocaleString()}</span>
              </div>
            </div>

            {/* External method selection */}
            {!selectedMethod && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setCategory('mobile')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${category === 'mobile' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                    <Smartphone size={20} className={category === 'mobile' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-xs font-semibold text-slate-700">Mobile</span>
                  </button>
                  <button onClick={() => setCategory('bank')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${category === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                    <Building2 size={20} className={category === 'bank' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-xs font-semibold text-slate-700">Benki</span>
                  </button>
                  <button onClick={() => setCategory('card')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${category === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                    <CreditCard size={20} className={category === 'card' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-xs font-semibold text-slate-700">Kadi</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {methods.map((m) => (
                    <button key={m.id} onClick={() => selectMethod(m.id)} className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group">
                      <div className={`w-10 h-10 rounded-xl ${m.color} ${m.textColor} flex items-center justify-center text-lg font-bold`}>{m.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.provider}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* External method details */}
            {selectedMethod && selectedMethodData && (
              <>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-xl ${selectedMethodData.color} ${selectedMethodData.textColor} flex items-center justify-center text-lg`}>{selectedMethodData.icon}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedMethodData.name}</p>
                    <p className="text-xs text-slate-500">{selectedMethodData.provider}</p>
                  </div>
                </div>
                {category === 'mobile' && (
                  <div>
                    <label className="label">Namba ya Simu</label>
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} placeholder="07XX XXX XXX" maxLength={10} className="input" />
                  </div>
                )}
                {category === 'card' && (
                  <>
                    <div>
                      <label className="label">Namba ya Kadi</label>
                      <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="0000 0000 0000 0000" className="input font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Mwezi/Mwaka</label>
                        <input type="text" value={cardExpiry} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCardExpiry(v.length >= 2 ? v.slice(0, 2) + '/' + v.slice(2) : v); }} placeholder="MM/YY" className="input font-mono" />
                      </div>
                      <div>
                        <label className="label">CVV</label>
                        <input type="text" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" className="input font-mono" />
                      </div>
                    </div>
                  </>
                )}
                {category === 'bank' && (
                  <div>
                    <label className="label">Namba ya Akaunti</label>
                    <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="Akaunti namba yako" className="input" />
                  </div>
                )}
                <button onClick={processPayment} disabled={!canSubmit} className="btn-primary w-full">
                  Lipa TSh {(amount - walletBalance).toLocaleString()} + Akiba
                </button>
                <button onClick={() => setSelectedMethod(null)} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">Rudi</button>
              </>
            )}
          </div>
        )}

        {/* ── External-only: select step ── */}
        {step === 'select' && (mode === 'external' || !profile || !wallet || walletBalance === 0) && (
          <>
            {/* Category tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setCategory('mobile')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${category === 'mobile' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <Smartphone size={20} className={category === 'mobile' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700">Mobile Money</span>
              </button>
              <button onClick={() => setCategory('bank')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${category === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <Building2 size={20} className={category === 'bank' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700">Bank Transfer</span>
              </button>
              <button onClick={() => setCategory('card')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${category === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <CreditCard size={20} className={category === 'card' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700">Card</span>
              </button>
            </div>

            {/* Methods */}
            <div className="space-y-2">
              {methods.map((m) => (
                <button key={m.id} onClick={() => { setMode('external'); selectMethod(m.id); }} className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group">
                  <div className={`w-10 h-10 rounded-xl ${m.color} ${m.textColor} flex items-center justify-center text-lg font-bold`}>{m.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.provider}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── External-only: details step ── */}
        {step === 'details' && mode === 'external' && selectedMethodData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className={`w-10 h-10 rounded-xl ${selectedMethodData.color} ${selectedMethodData.textColor} flex items-center justify-center text-lg`}>{selectedMethodData.icon}</div>
              <div>
                <p className="font-semibold text-slate-900">{selectedMethodData.name}</p>
                <p className="text-xs text-slate-500">{selectedMethodData.provider}</p>
              </div>
            </div>

            {category === 'mobile' && (
              <div>
                <label className="label">Namba ya Simu</label>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} placeholder="07XX XXX XXX" maxLength={10} className="input" />
                <p className="text-xs text-slate-400 mt-1">Utapokea ombi la kuthibitisha kwenye simu yako</p>
              </div>
            )}

            {category === 'card' && (
              <>
                <div>
                  <label className="label">Namba ya Kadi</label>
                  <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="0000 0000 0000 0000" className="input font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Mwezi/Mwaka</label>
                    <input type="text" value={cardExpiry} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCardExpiry(v.length >= 2 ? v.slice(0, 2) + '/' + v.slice(2) : v); }} placeholder="MM/YY" className="input font-mono" />
                  </div>
                  <div>
                    <label className="label">CVV</label>
                    <input type="text" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" className="input font-mono" />
                  </div>
                </div>
              </>
            )}

            {category === 'bank' && (
              <div>
                <label className="label">Namba ya Akaunti</label>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="Akaunti namba yako" className="input" />
                <p className="text-xs text-slate-400 mt-1">Tuma pesa kwenye akaunti ya AfhaApp kupitia benki yako</p>
              </div>
            )}

            <button onClick={processPayment} disabled={!canSubmit} className="btn-primary w-full">
              Lipa TSh {amount.toLocaleString()}
            </button>

            <button onClick={() => setStep('select')} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">
              Rudi
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-12">
            <Loader size={40} className="text-emerald-600 animate-spin" />
            <p className="text-slate-600 font-semibold mt-4">Inashughulikia malipo...</p>
            <p className="text-slate-400 text-sm mt-1">Tafadhali subiri</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <p className="text-slate-900 font-bold text-lg mt-4">Malipo Yamekamilika!</p>
            <p className="text-slate-500 text-sm mt-1">Asante kwa kulipa</p>
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <Shield size={12} />
          <span>Linalindwa kwa usimbaji fiche wa SSL</span>
        </div>
      </div>
    </Modal>
  );
}
