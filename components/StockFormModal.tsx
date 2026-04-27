'use client';

import { useState, useEffect } from 'react';
import { Stock } from '@/lib/types';
import { getStocks } from '@/lib/storage';

interface Props {
  initial: Stock | null;
  defaultCategory: 'us' | 'thai' | 'fund';
  dcaFor?: { ticker: string; name: string; category: 'us' | 'thai' | 'fund'; currentPrice: number };
  onSave: (data: Omit<Stock, 'id'>) => void;
  onClose: () => void;
}

// Auto-calculate buy commission (Dime / Thai broker standard rates)
function calcBuyCommission(tradeValue: number, category: 'us' | 'thai' | 'fund'): number {
  if (category === 'us' || category === 'fund') return 0;
  // Thai SET: 0.15% commission + 7% VAT, min ฿50 + VAT
  const commission = Math.max(tradeValue * 0.0015, 50);
  return Math.round(commission * 1.07);
}

async function fetchPrice(ticker: string, category: 'us' | 'thai' | 'fund') {
  const res = await fetch(`/api/stock-price?ticker=${encodeURIComponent(ticker)}&category=${category}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ดึงราคาไม่ได้');
  return data as { price: number; shortName: string };
}

export default function StockFormModal({ initial, defaultCategory, dcaFor, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    ticker: '',
    category: defaultCategory as 'us' | 'thai' | 'fund',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    totalAmount: '',
    currentPrice: '',
    note: '',
    buyCommission: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [lastFetched, setLastFetched] = useState('');
  const [fetchedName, setFetchedName] = useState('');
  const [isDca, setIsDca] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ticker: initial.ticker,
        category: initial.category,
        purchaseDate: initial.purchaseDate,
        purchasePrice: String(initial.purchasePrice),
        totalAmount: String(initial.purchasePrice * initial.shares),
        currentPrice: String(initial.currentPrice),
        note: initial.note || '',
        buyCommission: initial.buyCommission ? String(initial.buyCommission) : '',
      });
      setFetchedName(initial.name !== initial.ticker ? initial.name : '');
    }
  }, [initial]);

  // Pre-fill when opening as DCA from detail page
  useEffect(() => {
    if (dcaFor && !initial) {
      setForm((f) => ({
        ...f,
        ticker: dcaFor.ticker,
        category: dcaFor.category,
        currentPrice: String(dcaFor.currentPrice),
        purchasePrice: '',
        totalAmount: '',
        purchaseDate: new Date().toISOString().split('T')[0],
      }));
      setFetchedName(dcaFor.name !== dcaFor.ticker ? dcaFor.name : '');
      setIsDca(true);
    }
  }, [dcaFor, initial]);

  // Detect DCA (adding to existing ticker+category) when user types ticker
  useEffect(() => {
    if (initial || dcaFor) return;
    const ticker = form.ticker.trim().toUpperCase();
    if (!ticker) { setIsDca(false); return; }
    const exists = getStocks().some(
      (s) => s.ticker === ticker && s.category === form.category
    );
    setIsDca(exists);
  }, [form.ticker, form.category, initial, dcaFor]);

  async function handleFetchPrice() {
    if (!form.ticker.trim()) { setFetchError('กรุณาใส่ชื่อย่อหุ้นก่อน'); return; }
    setFetching(true); setFetchError('');
    try {
      const result = await fetchPrice(form.ticker.trim(), form.category);
      set('currentPrice', String(result.price));
      setFetchedName(result.shortName);
      setLastFetched(new Date().toLocaleTimeString('th-TH'));
      setErrors((e) => { const n = { ...e }; delete n['currentPrice']; return n; });
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'ดึงราคาไม่ได้');
    }
    setFetching(false);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.ticker.trim()) e.ticker = 'กรุณาใส่ชื่อย่อหุ้น';
    if (!form.purchaseDate) e.purchaseDate = 'กรุณาเลือกวันที่ซื้อ';
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) e.purchasePrice = 'ราคาซื้อต้องมากกว่า 0';
    if (!form.totalAmount || Number(form.totalAmount) <= 0) e.totalAmount = 'จำนวนเงินต้องมากกว่า 0';
    if (!form.currentPrice || Number(form.currentPrice) <= 0) e.currentPrice = 'กรุณาดึงราคาหรือกรอกเอง';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const ticker = form.ticker.trim().toUpperCase();
    onSave({
      name: fetchedName || ticker,
      ticker,
      category: form.category,
      purchaseDate: form.purchaseDate,
      purchasePrice: Number(form.purchasePrice),
      shares: Number(form.purchasePrice) > 0 ? Number(form.totalAmount) / Number(form.purchasePrice) : 0,
      currentPrice: Number(form.currentPrice),
      note: form.note.trim() || undefined,
      buyCommission: Number(form.buyCommission) || undefined,
    });
  }

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  const purchasePrice = Number(form.purchasePrice) || 0;
  const totalAmount = Number(form.totalAmount) || 0;
  const calculatedShares = purchasePrice > 0 ? totalAmount / purchasePrice : 0;
  const buyCommissionNum = Number(form.buyCommission) || 0;
  const totalCost = totalAmount + buyCommissionNum;
  const currentValue = Number(form.currentPrice) * calculatedShares || 0;
  const profitLoss = currentValue - totalCost;
  const isProfit = profitLoss >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-t-3xl w-full overflow-y-scroll"
           style={{
             boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
             maxHeight: '92dvh',
             WebkitOverflowScrolling: 'touch',
             paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
           }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Title */}
        <div className="flex items-center justify-between px-5 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {initial ? 'แก้ไขหุ้น' : isDca ? 'ซื้อเพิ่ม (DCA)' : 'เพิ่มหุ้นใหม่'}
            </h2>
            {isDca && (
              <p className="text-sm text-indigo-600 font-medium mt-0.5">
                จะรวมเข้ากับ {form.ticker.toUpperCase()} ที่มีอยู่ และคำนวณราคาเฉลี่ยใหม่
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center active:bg-slate-200">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 space-y-5">
          {/* Category */}
          <div>
            <label className="label">ประเภท</label>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {(['us', 'thai', 'fund'] as const).map((cat) => (
                <button key={cat}
                  onClick={() => { set('category', cat); setFetchError(''); setLastFetched(''); setFetchedName(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    form.category === cat
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400'
                  }`}>
                  {cat === 'us' ? '🇺🇸 สหรัฐ' : cat === 'thai' ? '🇹🇭 ไทย' : '🏦 กองทุน'}
                </button>
              ))}
            </div>
          </div>

          {/* Ticker */}
          <div>
            <label className="label">{form.category === 'fund' ? 'รหัสกองทุน' : 'ชื่อย่อหุ้น (Ticker)'}</label>
            <input type="text"
              value={form.ticker}
              onChange={(e) => { set('ticker', e.target.value); setLastFetched(''); setFetchedName(''); }}
              placeholder={form.category === 'us' ? 'เช่น AAPL, NVDA, TSLA' : form.category === 'thai' ? 'เช่น PTT, ADVANC, SCB' : 'เช่น KFSDIV, TMBUSB'}
              className={`input-field uppercase ${errors.ticker ? 'border-rose-400' : ''}`}
            />
            {errors.ticker && <p className="text-rose-500 text-sm mt-1">{errors.ticker}</p>}
            {fetchedName && <p className="text-emerald-600 text-sm mt-1 font-medium">✓ {fetchedName}</p>}
          </div>

          {/* Purchase Date */}
          <div>
            <label className="label">วันที่ซื้อ</label>
            <input type="date" value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
              className={`input-field ${errors.purchaseDate ? 'border-rose-400' : ''}`} />
            {errors.purchaseDate && <p className="text-rose-500 text-sm mt-1">{errors.purchaseDate}</p>}
          </div>

          {/* Purchase Price + Total Amount side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{form.category === 'fund' ? 'ราคาซื้อ/หน่วย (฿)' : `ราคาซื้อ/หุ้น (${form.category === 'us' ? '$' : '฿'})`}</label>
              <input type="number" inputMode="decimal"
                value={form.purchasePrice}
                onChange={(e) => set('purchasePrice', e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className={`input-field ${errors.purchasePrice ? 'border-rose-400' : ''}`} />
              {errors.purchasePrice && <p className="text-rose-500 text-xs mt-1">{errors.purchasePrice}</p>}
            </div>
            <div>
              <label className="label">จำนวนเงินที่ลงทุน ({form.category === 'us' ? '$' : '฿'})</label>
              <input type="number" inputMode="decimal"
                value={form.totalAmount}
                onChange={(e) => set('totalAmount', e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className={`input-field ${errors.totalAmount ? 'border-rose-400' : ''}`} />
              {errors.totalAmount && <p className="text-rose-500 text-xs mt-1">{errors.totalAmount}</p>}
              {calculatedShares > 0 && !errors.totalAmount && (
                <p className="text-indigo-500 text-xs mt-1 font-medium">
                  = {calculatedShares % 1 === 0
                      ? calculatedShares.toLocaleString('th-TH')
                      : calculatedShares.toFixed(4)} หุ้น
                </p>
              )}
            </div>
          </div>

          {/* Current Price */}
          <div>
            <label className="label">{form.category === 'fund' ? 'NAV ปัจจุบัน/หน่วย (฿)' : `ราคาปัจจุบัน/หุ้น (${form.category === 'us' ? '$' : '฿'})`}</label>
            <button
              onClick={handleFetchPrice}
              disabled={fetching || !form.ticker.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base mb-2 transition-all border-2 ${
                fetching || !form.ticker.trim()
                  ? 'border-slate-200 text-slate-300 bg-slate-50'
                  : 'border-indigo-300 text-indigo-600 bg-indigo-50 active:bg-indigo-100'
              }`}
            >
              {fetching ? (
                <><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> กำลังดึงราคา...</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg> ดึงราคาอัตโนมัติ</>
              )}
            </button>

            {fetchError && (
              <div className="flex items-center gap-2 text-rose-600 text-sm mb-2 bg-rose-50 rounded-xl px-3 py-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {fetchError}
              </div>
            )}
            {lastFetched && !fetchError && (
              <p className="text-emerald-600 text-sm mb-2">✓ อัปเดตเวลา {lastFetched}</p>
            )}

            <input type="number" inputMode="decimal"
              value={form.currentPrice}
              onChange={(e) => set('currentPrice', e.target.value)}
              placeholder="หรือพิมพ์เองได้"
              min="0" step="0.01"
              className={`input-field ${errors.currentPrice ? 'border-rose-400' : ''}`} />
            {errors.currentPrice && <p className="text-rose-500 text-sm mt-1">{errors.currentPrice}</p>}
          </div>

          {/* Buy Commission */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label">ค่าธรรมเนียมซื้อ (ไม่บังคับ)</label>
              {totalAmount > 0 && (
                <button
                  type="button"
                  onClick={() => set('buyCommission', String(calcBuyCommission(totalAmount, form.category)))}
                  className="text-xs text-indigo-500 font-semibold active:opacity-60"
                >
                  คำนวณอัตโนมัติ
                </button>
              )}
            </div>
            <input type="number" inputMode="decimal"
              value={form.buyCommission}
              onChange={(e) => set('buyCommission', e.target.value)}
              placeholder={form.category === 'us' || form.category === 'fund' ? '0 (ไม่มีค่าธรรมเนียม)' : 'เช่น 53'}
              min="0" step="0.01"
              className="input-field" />
            <p className="text-xs text-slate-400 mt-1">
              {form.category === 'thai' ? 'SET: 0.15% + VAT 7% (ขั้นต่ำ ฿53.50)' : form.category === 'us' ? 'หุ้นสหรัฐ: ฟรี' : 'กองทุน: ฟรี'}
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="label">หมายเหตุ (ไม่บังคับ)</label>
            <input type="text" value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="บันทึกเพิ่มเติม..."
              className="input-field" />
          </div>

          {/* Preview */}
          {totalCost > 0 && currentValue > 0 && (
            <div className={`rounded-2xl p-4 border-2 ${isProfit ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <p className="text-xs text-slate-400 font-medium">ต้นทุนรวม</p>
                  <p className="font-bold text-slate-800 text-base">
                    {form.category === 'us' ? `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `฿${totalCost.toLocaleString('th-TH')}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">มูลค่าปัจจุบัน</p>
                  <p className="font-bold text-slate-800 text-base">
                    {form.category === 'us' ? `$${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `฿${currentValue.toLocaleString('th-TH')}`}
                  </p>
                </div>
              </div>
              <div className={`text-center font-black text-xl ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfit ? '📈' : '📉'} {isProfit ? '+' : ''}{form.category === 'us'
                  ? `$${Math.abs(profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : `฿${Math.abs(profitLoss).toLocaleString('th-TH')}`
                }
                {' '}({isProfit ? '+' : '-'}{totalCost > 0 ? (Math.abs(profitLoss / totalCost) * 100).toFixed(2) : '0'}%)
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary">ยกเลิก</button>
            <button onClick={handleSubmit} className="flex-1 btn-primary">{initial ? 'บันทึก' : 'เพิ่มหุ้น'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
