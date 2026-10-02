import { useState } from 'react';
import {
  FlaskConical, Plus, Minus, ShoppingCart, Calendar, Clock, Home,
  Building2, CheckCircle2, Trash2, ChevronRight, Search
} from 'lucide-react';
import { Card, Badge, Spinner, EmptyState, SectionHeader, Modal } from './ui';
import { LAB_TEST_CATALOG } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Profile, LabTest } from '@/types';
import { PaymentCheckout } from './PaymentCheckout';

interface LabModuleProps {
  profile: Profile;
  onOrderComplete?: () => void;
}

interface CartItem {
  name: string;
  price: number;
  category: string;
  quantity: number;
}

export function LabModule({ profile, onOrderComplete }: LabModuleProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [collectionType, setCollectionType] = useState<'home' | 'visit'>('visit');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const categories = Array.from(new Set(LAB_TEST_CATALOG.map((t) => t.category)));

  const filteredTests = LAB_TEST_CATALOG.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function addToCart(test: typeof LAB_TEST_CATALOG[number]) {
    setCart((prev) => {
      const existing = prev.find((c) => c.name === test.name);
      if (existing) {
        return prev.map((c) => c.name === test.name ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { name: test.name, price: test.price, category: test.category, quantity: 1 }];
    });
  }

  function removeFromCart(name: string) {
    setCart((prev) => prev.filter((c) => c.name !== name));
  }

  function updateQty(name: string, delta: number) {
    setCart((prev) => prev.map((c) => {
      if (c.name === name) {
        const newQty = c.quantity + delta;
        return newQty <= 0 ? null : { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean) as CartItem[]);
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  async function submitOrder(paymentMethod: string, transactionId: string) {
    setOrdering(true);
    for (const item of cart) {
      for (let i = 0; i < item.quantity; i++) {
        await supabase.from('lab_tests').insert({
          patient_id: profile.id,
          patient_name: profile.name,
          test_name: item.name,
          test_category: item.category,
          status: 'ordered',
          notes: `Collection: ${collectionType === 'home' ? 'Home Sample Collection' : 'Visit Lab'} | Date: ${scheduledDate} ${scheduledTime} | Payment: ${paymentMethod} (${transactionId})`,
        });
      }
    }
    setOrdering(false);
    setPaymentOpen(false);
    setCheckoutOpen(false);
    setOrderSuccess(true);
    setCart([]);
    setTimeout(() => setOrderSuccess(false), 3000);
    onOrderComplete?.();
  }

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <Card className="p-5 bg-gradient-to-br from-teal-600 to-teal-800 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <FlaskConical size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Maabara (Laboratory)</h2>
            <p className="text-sm text-teal-100">Agiza vipimo vya afya — nyumbani au kwenye maabara</p>
          </div>
        </div>
      </Card>

      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tafuta vipimo..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            categoryFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Zote
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === cat ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Test catalog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredTests.map((test) => {
          const inCart = cart.find((c) => c.name === test.name);
          return (
            <div key={test.name} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                      <FlaskConical size={18} />
                    </div>
                    <Badge color="secondary">{test.category}</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{test.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{test.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-slate-900">TSh {test.price.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={11} /> {test.turnaround}
                    </span>
                  </div>
                </div>
              </div>
              {inCart ? (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(test.name, -1)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-slate-900 w-6 text-center">{inCart.quantity}</span>
                    <button onClick={() => updateQty(test.name, 1)} className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(test.name)} className="text-red-500 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(test)}
                  className="w-full mt-3 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} /> Ongeza kwenye Kikapu
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 animate-slide-up">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full flex items-center justify-between gap-3 bg-teal-600 text-white rounded-2xl px-5 py-3.5 shadow-lg hover:bg-teal-700 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart size={22} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-teal-700 text-xs font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <span className="font-semibold">Kikapu ({cartCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">TSh {cartTotal.toLocaleString()}</span>
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Agiza Vipimo" size="md">
        <div className="space-y-4">
          {/* Cart items */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">TSh {item.price.toLocaleString()} x {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.name, -1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                    <Minus size={12} />
                  </button>
                  <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.name, 1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Collection type */}
          <div>
            <label className="label">Chagua njia ya kukusanya sampuli</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCollectionType('visit')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  collectionType === 'visit' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Building2 size={20} className={collectionType === 'visit' ? 'text-teal-600' : 'text-slate-400'} />
                <p className="font-semibold text-sm mt-2">Tembelea Maabara</p>
                <p className="text-xs text-slate-500">Nenda kwenye maabara</p>
              </button>
              <button
                onClick={() => setCollectionType('home')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  collectionType === 'home' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Home size={20} className={collectionType === 'home' ? 'text-teal-600' : 'text-slate-400'} />
                <p className="font-semibold text-sm mt-2">Kukusanywa Nyumbani</p>
                <p className="text-xs text-slate-500">Mtaalamu kuja nyumbani</p>
              </button>
            </div>
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tarehe</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>
            <div>
              <label className="label">Saa</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
            <span className="font-semibold text-teal-800">Jumla</span>
            <span className="text-xl font-bold text-teal-700">TSh {cartTotal.toLocaleString()}</span>
          </div>

          <button
            onClick={() => { setCheckoutOpen(false); setPaymentOpen(true); }}
            disabled={!scheduledDate || !scheduledTime || ordering || cartCount === 0}
            className="btn-primary w-full"
          >
            <Calendar size={18} />
            Endelea kwa Malipo
          </button>
        </div>
      </Modal>

      {/* Payment checkout */}
      <PaymentCheckout
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        amount={cartTotal}
        description={`${cartCount} vipimo vya maabara`}
        onPaymentComplete={submitOrder}
      />

      {/* Success notification */}
      {orderSuccess && (
        <div className="fixed bottom-24 left-0 right-0 z-50 px-4 animate-slide-up">
          <div className="max-w-md mx-auto bg-emerald-600 text-white rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3">
            <CheckCircle2 size={24} />
            <div>
              <p className="font-semibold">Agizo limekamilika!</p>
              <p className="text-sm text-emerald-100">Vipimo vyako vimeagizwa</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
