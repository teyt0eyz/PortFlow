'use client';

import { useState } from 'react';
import { Stock, SellTransaction } from '@/lib/types';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';

interface Props {
  stock: Stock;
  onSell: (tx: Omit<SellTransaction, 'id'>) => void;
  onClose: () => void;
}

export default function SellModal({ stock, onSell, onClose }: Props) {
  const fmt = stock.category === 'us' ? formatUSD : formatTHB;
  const sym = stock.category === 'us' ? '$' : '฿';
  const unitLabel = stock.category === 'fund' ? 'หน่วย' : 'หุ้น';

  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellPrice, setSellPrice] = useState(String(stock.currentPrice));
  const [totalSellAmount, setTotalSellAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sellPriceNum = Number(sellPrice) || 0;
  const totalSellAmountNum = Number(totalSellAmount) || 0;
  const sharesSold = sellPriceNum > 0 ? totalSellAmountNum / sellPriceNum : 0;
  const maxAmount = stock.purchasePrice * stock.shares; // original cost — used for max reference
  const maxProceeds = stock.currentPrice * stock.shares;
  const isOverSelling = sharesSold > stock.shares + 0.0001;

  const costBasis = stock.purchasePrice * sharesSold;
  const proceeds = totalSellAmountNum;
  const profit = proceeds - costBasis;
  const profitPct = costBasis > 0 ? (profit / costBasis) * 100 : 0;
  const isProfit = profit >= 0;

  function clearError(key: string) {
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!sellDate) e.sellDate = 'กรุณาเลือกวันที่ขาย';
    if (!sellPrice || sellPriceNum <= 0) e.sellPrice = 'ราคาขายต้องมากกว่า 0';
    if (!totalSellAmount || totalSellAmountNum <= 0) e.totalSellAmount = 'จำนวนเงินต้องมากกว่า 0';
    if (isOverSelling) e.totalSellAmount = `ขายเกินจำนวนที่ถืออยู่ (สูงสุด ${maxProceeds.toFixed(2)})`;
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSell({
      ticker: stock.ticker,
      name: stock.name,
      category: stock.category,
      purchaseDate: stock.purchaseDate,
      purchasePrice: stock.purchasePrice,
      sellDate,
      sellPrice: sellPriceNum,
      sharesSold,
      proceeds,
      costBasis,
      profit,
    });
  }

  function fillSellAll() {
    setSellPrice(String(stock.currentPrice));
    setTotalSellAmount(String(stock.currentPrice * stock.shares));
    setErrors({});
  }

  const sharesDisplay = stock.shares % 1 === 0
    ? stock.shares.toLocaleString('th-TH')
    : stock.shares.toFixed(4);

  return (
    <div className="fixed inset-0 z-50 flex items-end"
         style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-t-3xl w-full max-h-[92vh] overflow-y-auto pb-8"
           style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Title */}
        <div className="flex items-center justify-between px-5 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">บันทึกการขาย</h2>
            <p className="text-slate-400 text-sm">{stock.ticker} · ถืออยู่ {sharesDisplay} {unitLabel}</p>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center active:bg-slate-200">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 space-y-5">
          {/* Info bar */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-slate-400 font-medium">ราคาซื้อ/{unitLabel}</p>
              <p className="font-bold text-slate-700">{fmt(stock.purchasePrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">ราคาตลาดล่าสุด</p>
              <p className="font-bold text-slate-700">{fmt(stock.currentPrice)}</p>
            </div>
          </div>

          {/* Sell Date */}
          <div>
            <label className="label">วันที่ขาย</label>
            <input type="date" value={sellDate}
              onChange={(e) => { setSellDate(e.target.value); clearError('sellDate'); }}
              className={`input-field ${errors.sellDate ? 'border-rose-400' : ''}`} />
            {errors.sellDate && <p className="text-rose-500 text-sm mt-1">{errors.sellDate}</p>}
          </div>

          {/* Sell Price + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ราคาขาย/{unitLabel} ({sym})</label>
              <input type="number" inputMode="decimal"
                value={sellPrice}
                onChange={(e) => { setSellPrice(e.target.value); clearError('sellPrice'); }}
                placeholder="0.00" min="0" step="0.01"
                className={`input-field ${errors.sellPrice ? 'border-rose-400' : ''}`} />
              {errors.sellPrice && <p className="text-rose-500 text-xs mt-1">{errors.sellPrice}</p>}
            </div>
            <div>
              <label className="label">จำนวนเงินที่ขาย ({sym})</label>
              <input type="number" inputMode="decimal"
                value={totalSellAmount}
                onChange={(e) => { setTotalSellAmount(e.target.value); clearError('totalSellAmount'); }}
                placeholder="0.00" min="0" step="0.01"
                className={`input-field ${errors.totalSellAmount ? 'border-rose-400' : ''}`} />
              {errors.totalSellAmount && <p className="text-rose-500 text-xs mt-1">{errors.totalSellAmount}</p>}
              {sharesSold > 0 && !errors.totalSellAmount && (
                <p className={`text-xs mt-1 font-medium ${isOverSelling ? 'text-rose-500' : 'text-indigo-500'}`}>
                  = {sharesSold % 1 === 0 ? sharesSold.toLocaleString('th-TH') : sharesSold.toFixed(4)} {unitLabel}
                </p>
              )}
            </div>
          </div>

          {/* Sell all shortcut */}
          <button
            onClick={fillSellAll}
            className="w-full py-2.5 rounded-2xl border-2 border-dashed border-rose-200 text-rose-500 text-sm font-semibold active:bg-rose-50"
          >
            ขายทั้งหมด ที่ราคาตลาด ({fmt(maxProceeds)})
          </button>

          {/* P/L Preview */}
          {sharesSold > 0 && !isOverSelling && costBasis > 0 && (
            <div className={`rounded-2xl p-4 border-2 ${isProfit ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">กำไร / ขาดทุนจากการขายครั้งนี้</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium">ต้นทุนส่วนนี้</p>
                  <p className="font-bold text-slate-800">{fmt(costBasis)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">รายรับ</p>
                  <p className="font-bold text-slate-800">{fmt(proceeds)}</p>
                </div>
              </div>
              <div className={`text-center font-black text-xl ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfit ? '📈' : '📉'} {isProfit ? '+' : ''}{fmt(profit)}
                {' '}({isProfit ? '+' : '-'}{Math.abs(profitPct).toFixed(2)}%)
              </div>
              {maxAmount !== undefined && (
                <p className="text-center text-xs text-slate-400 mt-2">
                  {sharesSold >= stock.shares - 0.0001 ? 'ขายทั้งหมด — รายการจะถูกลบออกจากพอร์ต' : `เหลือ ${(stock.shares - sharesSold).toFixed(4)} ${unitLabel} ในพอร์ต`}
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary">ยกเลิก</button>
            <button onClick={handleSubmit}
              className="flex-1 py-3.5 rounded-2xl font-bold text-lg text-white active:opacity-80"
              style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)' }}>
              ยืนยันการขาย
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
