'use client';

import { useState } from 'react';
import { Stock, Dividend } from '@/lib/types';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';

interface Props {
  stock: Stock;
  onSave: (d: Omit<Dividend, 'id'>) => void;
  onClose: () => void;
}

export default function DividendModal({ stock, onSave, onClose }: Props) {
  const defaultTaxRate = stock.category === 'us' ? '15' : '10';
  const taxOptions = stock.category === 'us' ? [0, 15, 30] : [0, 10];

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPerShare, setAmountPerShare] = useState('');
  const [shares, setShares] = useState(
    stock.shares % 1 === 0 ? String(stock.shares) : stock.shares.toFixed(4)
  );
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fmt = stock.category === 'us' ? formatUSD : formatTHB;
  const sym = stock.category === 'us' ? '$' : '฿';
  const amtPerShare = Number(amountPerShare) || 0;
  const sharesNum = Number(shares) || 0;
  const taxRateNum = Number(taxRate) || 0;
  const gross = amtPerShare * sharesNum;
  const tax = gross * (taxRateNum / 100);
  const net = gross - tax;

  function validate() {
    const e: Record<string, string> = {};
    if (!date) e.date = 'กรุณาเลือกวันที่';
    if (!amountPerShare || amtPerShare <= 0) e.amountPerShare = 'กรุณาใส่จำนวนเงินปันผล/หุ้น';
    if (!shares || sharesNum <= 0) e.shares = 'จำนวนหุ้นต้องมากกว่า 0';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({
      stockId: stock.id,
      ticker: stock.ticker,
      name: stock.name,
      category: stock.category,
      date,
      amountPerShare: amtPerShare,
      shares: sharesNum,
      grossAmount: gross,
      withholdingTaxRate: taxRateNum,
      withholdingTax: tax,
      netAmount: net,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end"
         style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-t-3xl w-full overflow-y-scroll"
           style={{
             boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
             maxHeight: '92dvh',
             WebkitOverflowScrolling: 'touch',
             paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
           }}>

        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">บันทึกเงินปันผล</h2>
            <p className="text-sm text-emerald-600 font-semibold mt-0.5">
              💰 {stock.ticker}{stock.name !== stock.ticker ? ` — ${stock.name}` : ''}
            </p>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center active:bg-slate-200">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 space-y-5">

          {/* Date */}
          <div>
            <label className="label">วันที่จ่ายปันผล</label>
            <input type="date" value={date}
              onChange={(e) => { setDate(e.target.value); setErrors((err) => { const n = { ...err }; delete n.date; return n; }); }}
              className={`input-field ${errors.date ? 'border-rose-400' : ''}`} />
            {errors.date && <p className="text-rose-500 text-sm mt-1">{errors.date}</p>}
          </div>

          {/* Amount per share + Shares */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ปันผล/หุ้น ({sym})</label>
              <input type="number" inputMode="decimal"
                value={amountPerShare}
                onChange={(e) => { setAmountPerShare(e.target.value); setErrors((err) => { const n = { ...err }; delete n.amountPerShare; return n; }); }}
                placeholder="0.00" min="0" step="0.0001"
                className={`input-field ${errors.amountPerShare ? 'border-rose-400' : ''}`} />
              {errors.amountPerShare && <p className="text-rose-500 text-xs mt-1">{errors.amountPerShare}</p>}
            </div>
            <div>
              <label className="label">จำนวนหุ้น</label>
              <input type="number" inputMode="decimal"
                value={shares}
                onChange={(e) => { setShares(e.target.value); setErrors((err) => { const n = { ...err }; delete n.shares; return n; }); }}
                placeholder="0" min="0"
                className={`input-field ${errors.shares ? 'border-rose-400' : ''}`} />
              {errors.shares && <p className="text-rose-500 text-xs mt-1">{errors.shares}</p>}
            </div>
          </div>

          {/* Withholding tax */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label">ภาษีหัก ณ ที่จ่าย</label>
              <span className="text-xs text-slate-400">
                {stock.category === 'us' ? 'US treaty: 15% / ไม่มี W-8BEN: 30%' : 'หุ้นไทย/กองทุน: 10%'}
              </span>
            </div>
            <div className="flex gap-2">
              {taxOptions.map((r) => (
                <button key={r}
                  onClick={() => setTaxRate(String(r))}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex-shrink-0 ${
                    taxRate === String(r)
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 bg-white'
                  }`}>
                  {r}%
                </button>
              ))}
              <input type="number" inputMode="decimal"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="%" min="0" max="100" step="0.5"
                className="flex-1 input-field text-center min-w-0" />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="label">หมายเหตุ (ไม่บังคับ)</label>
            <input type="text" value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ปันผลไตรมาส 1/2568"
              className="input-field" />
          </div>

          {/* Preview */}
          {gross > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">สรุป</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">ปันผลรวม (ก่อนหักภาษี)</span>
                  <span className="font-bold text-slate-800">{fmt(gross)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">ภาษีหัก ณ ที่จ่าย {taxRateNum}%</span>
                    <span className="font-semibold text-rose-500">−{fmt(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2.5 border-t border-emerald-200">
                  <span className="font-bold text-emerald-700 text-base">รับสุทธิ</span>
                  <span className="font-black text-emerald-700 text-2xl">{fmt(net)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary">ยกเลิก</button>
            <button onClick={handleSubmit} className="flex-1 btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  );
}
