'use client';

import { useState, useEffect } from 'react';
import { Stock } from '@/lib/types';

interface Props {
  initial: Stock | null;
  defaultCategory: 'us' | 'thai';
  onSave: (data: Omit<Stock, 'id'>) => void;
  onClose: () => void;
}

const DEFAULT_FORM = {
  name: '',
  ticker: '',
  category: 'us' as 'us' | 'thai',
  purchaseDate: new Date().toISOString().split('T')[0],
  purchasePrice: '',
  shares: '',
  currentPrice: '',
  note: '',
};

export default function StockFormModal({ initial, defaultCategory, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, category: defaultCategory });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        ticker: initial.ticker,
        category: initial.category,
        purchaseDate: initial.purchaseDate,
        purchasePrice: String(initial.purchasePrice),
        shares: String(initial.shares),
        currentPrice: String(initial.currentPrice),
        note: initial.note || '',
      });
    }
  }, [initial]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.ticker.trim()) e.ticker = 'กรุณาใส่ชื่อย่อหุ้น';
    if (!form.name.trim()) e.name = 'กรุณาใส่ชื่อเต็มหุ้น';
    if (!form.purchaseDate) e.purchaseDate = 'กรุณาเลือกวันที่ซื้อ';
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) e.purchasePrice = 'ราคาซื้อต้องมากกว่า 0';
    if (!form.shares || Number(form.shares) <= 0) e.shares = 'จำนวนหุ้นต้องมากกว่า 0';
    if (!form.currentPrice || Number(form.currentPrice) <= 0) e.currentPrice = 'ราคาปัจจุบันต้องมากกว่า 0';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    onSave({
      name: form.name.trim(),
      ticker: form.ticker.trim().toUpperCase(),
      category: form.category,
      purchaseDate: form.purchaseDate,
      purchasePrice: Number(form.purchasePrice),
      shares: Number(form.shares),
      currentPrice: Number(form.currentPrice),
      note: form.note.trim() || undefined,
    });
  }

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  const totalCost = Number(form.purchasePrice) * Number(form.shares) || 0;
  const currentValue = Number(form.currentPrice) * Number(form.shares) || 0;
  const profitLoss = currentValue - totalCost;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[92vh] overflow-y-auto pb-8">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        <div className="flex items-center justify-between px-5 mb-5">
          <h2 className="text-2xl font-bold text-gray-800">
            {initial ? 'แก้ไขหุ้น' : 'เพิ่มหุ้นใหม่'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* Category */}
          <div>
            <label className="label">ประเภทหุ้น</label>
            <div className="flex gap-3">
              <button
                onClick={() => set('category', 'us')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-lg border-2 transition-colors
                  ${form.category === 'us' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-500'}`}
              >
                🇺🇸 สหรัฐ
              </button>
              <button
                onClick={() => set('category', 'thai')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-lg border-2 transition-colors
                  ${form.category === 'thai' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-500'}`}
              >
                🇹🇭 ไทย
              </button>
            </div>
          </div>

          {/* Ticker */}
          <div>
            <label className="label">ชื่อย่อหุ้น (Ticker) *</label>
            <input
              type="text"
              value={form.ticker}
              onChange={(e) => set('ticker', e.target.value)}
              placeholder={form.category === 'us' ? 'เช่น AAPL, NVDA, TSLA' : 'เช่น PTT, ADVANC, SCB'}
              className={`input-field ${errors.ticker ? 'border-red-400' : ''}`}
            />
            {errors.ticker && <p className="text-red-500 text-sm mt-1">{errors.ticker}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="label">ชื่อเต็มบริษัท *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={form.category === 'us' ? 'เช่น Apple Inc.' : 'เช่น บริษัท ปตท. จำกัด'}
              className={`input-field ${errors.name ? 'border-red-400' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Purchase Date */}
          <div>
            <label className="label">วันที่ซื้อ *</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
              className={`input-field ${errors.purchaseDate ? 'border-red-400' : ''}`}
            />
            {errors.purchaseDate && <p className="text-red-500 text-sm mt-1">{errors.purchaseDate}</p>}
          </div>

          {/* Purchase Price */}
          <div>
            <label className="label">
              ราคาซื้อต่อหุ้น * ({form.category === 'us' ? 'USD' : 'บาท'})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={form.purchasePrice}
              onChange={(e) => set('purchasePrice', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`input-field ${errors.purchasePrice ? 'border-red-400' : ''}`}
            />
            {errors.purchasePrice && <p className="text-red-500 text-sm mt-1">{errors.purchasePrice}</p>}
          </div>

          {/* Shares */}
          <div>
            <label className="label">จำนวนหุ้น *</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.shares}
              onChange={(e) => set('shares', e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className={`input-field ${errors.shares ? 'border-red-400' : ''}`}
            />
            {errors.shares && <p className="text-red-500 text-sm mt-1">{errors.shares}</p>}
          </div>

          {/* Current Price */}
          <div>
            <label className="label">
              ราคาปัจจุบันต่อหุ้น * ({form.category === 'us' ? 'USD' : 'บาท'})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={form.currentPrice}
              onChange={(e) => set('currentPrice', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`input-field ${errors.currentPrice ? 'border-red-400' : ''}`}
            />
            {errors.currentPrice && <p className="text-red-500 text-sm mt-1">{errors.currentPrice}</p>}
          </div>

          {/* Note */}
          <div>
            <label className="label">หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="บันทึกเพิ่มเติม..."
              className="input-field"
            />
          </div>

          {/* Live Preview */}
          {totalCost > 0 && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-sm font-semibold text-blue-700 mb-2">ตัวอย่างผลลัพธ์</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">ต้นทุนรวม</p>
                  <p className="font-bold text-base text-gray-800">
                    {form.category === 'us'
                      ? `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : `฿${totalCost.toLocaleString('th-TH')}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">มูลค่าปัจจุบัน</p>
                  <p className="font-bold text-base text-gray-800">
                    {form.category === 'us'
                      ? `$${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : `฿${currentValue.toLocaleString('th-TH')}`
                    }
                  </p>
                </div>
              </div>
              {currentValue > 0 && (
                <div className={`mt-2 text-center font-bold text-lg ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitLoss >= 0 ? '📈 กำไร ' : '📉 ขาดทุน '}
                  {form.category === 'us'
                    ? `$${Math.abs(profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : `฿${Math.abs(profitLoss).toLocaleString('th-TH')}`
                  }
                  {' '}
                  ({profitLoss >= 0 ? '+' : '-'}{totalCost > 0 ? (Math.abs(profitLoss / totalCost) * 100).toFixed(2) : '0'}%)
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 btn-secondary">
              ยกเลิก
            </button>
            <button onClick={handleSubmit} className="flex-1 btn-primary">
              {initial ? 'บันทึก' : 'เพิ่มหุ้น'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
