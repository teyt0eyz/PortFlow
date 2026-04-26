'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStocks, updateStock, deleteStock, addSellTransaction, generateId } from '@/lib/storage';
import { Stock, SellTransaction } from '@/lib/types';
import { calculateStockValue } from '@/lib/stockCalculation';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';
import StockFormModal from '@/components/StockFormModal';
import SellModal from '@/components/SellModal';

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-base">{label}</span>
      <span className={`font-semibold text-base text-right ${valueClass || 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  useEffect(() => {
    const found = getStocks().find((s) => s.id === params.id);
    if (!found) router.replace('/stocks');
    else setStock(found);
  }, [params.id, router]);

  async function handleRefreshPrice() {
    if (!stock) return;
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await fetch(`/api/stock-price?ticker=${encodeURIComponent(stock.ticker)}&category=${stock.category}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = { ...stock, currentPrice: data.price };
      updateStock(updated);
      setStock(updated);
      setRefreshMsg(`✓ อัปเดตเวลา ${new Date().toLocaleTimeString('th-TH')}`);
    } catch (e: unknown) {
      setRefreshMsg(e instanceof Error ? e.message : 'ดึงราคาไม่ได้');
    }
    setRefreshing(false);
  }

  function handleSaveEdit(data: Omit<Stock, 'id'>) {
    if (!stock) return;
    const updated = { ...data, id: stock.id };
    updateStock(updated);
    setStock(updated);
    setShowEdit(false);
  }

  function handleSell(txData: Omit<SellTransaction, 'id'>) {
    if (!stock) return;
    addSellTransaction({ ...txData, id: generateId() });
    const remaining = stock.shares - txData.sharesSold;
    if (remaining <= 0.0001) {
      deleteStock(stock.id);
      router.replace(`/stocks?tab=${stock.category}`);
    } else {
      const updated = { ...stock, shares: remaining };
      updateStock(updated);
      setStock(updated);
      setShowSell(false);
    }
  }

  function handleDelete() {
    if (!stock) return;
    deleteStock(stock.id);
    router.replace(`/stocks?tab=${stock.category === 'fund' ? 'fund' : stock.category}`);
  }

  if (!stock) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { currentValue, profitLoss, profitLossPercent, totalCost, tradeCost } = calculateStockValue(stock);
  const fmt = stock.category === 'us' ? formatUSD : formatTHB;
  const isProfit = profitLoss >= 0;

  const plGradient = isProfit
    ? 'linear-gradient(135deg, #059669, #10B981)'
    : 'linear-gradient(135deg, #E11D48, #F43F5E)';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F9FF 100%)' }}>

      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: plGradient }}>
        {/* Decorative */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />

        {/* Back button */}
        <div className="px-4 pt-14 pb-0">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/80 text-base font-medium mb-4 active:opacity-60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </button>

          {/* Ticker */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl border border-white/30">
              {stock.category === 'us' ? '🇺🇸' : stock.category === 'thai' ? '🇹🇭' : '🏦'}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">{stock.ticker}</h1>
              {stock.name && stock.name !== stock.ticker && (
                <p className="text-white/70 text-sm">{stock.name}</p>
              )}
            </div>
          </div>

          {/* Big P/L */}
          <div className="pb-8">
            <p className="text-white/70 text-sm font-medium mb-1">
              {isProfit ? '📈 กำไร' : '📉 ขาดทุน'}
            </p>
            <p className="text-5xl font-black text-white leading-tight">
              {isProfit ? '+' : ''}{fmt(profitLoss)}
            </p>
            <p className="text-white/80 text-xl font-bold mt-1">
              {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-8">

        {/* Current Price Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-700">ราคาวันนี้</h2>
            <button
              onClick={handleRefreshPrice}
              disabled={refreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                refreshing ? 'border-slate-200 text-slate-300' : 'border-indigo-200 text-indigo-600 bg-indigo-50 active:bg-indigo-100'
              }`}
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? '...' : 'อัปเดต'}
            </button>
          </div>
          {refreshMsg && (
            <p className={`text-sm mb-3 font-medium ${refreshMsg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-500'}`}>
              {refreshMsg}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">ราคา/หุ้น</p>
              <p className="text-lg font-black text-slate-800">{fmt(stock.currentPrice)}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">มูลค่าพอร์ต</p>
              <p className="text-lg font-black text-slate-800">{fmt(currentValue)}</p>
            </div>
          </div>
        </div>

        {/* Investment Details */}
        <div className="card">
          <h2 className="text-lg font-bold text-slate-700 mb-1">ข้อมูลการลงทุน</h2>
          <InfoRow label="วันที่ซื้อ" value={stock.purchaseDate} />
          <InfoRow label={stock.category === 'fund' ? 'จำนวนหน่วย' : 'จำนวนหุ้น'}
            value={`${stock.shares % 1 === 0 ? stock.shares.toLocaleString('th-TH') : stock.shares.toFixed(4)} ${stock.category === 'fund' ? 'หน่วย' : 'หุ้น'}`} />
          <InfoRow label="ราคาซื้อ / หุ้น" value={fmt(stock.purchasePrice)} />
          {stock.buyCommission != null && stock.buyCommission > 0 && (
            <InfoRow label="ค่าคอมมิชชั่นซื้อ" value={fmt(stock.buyCommission)} />
          )}
          <div className="mt-2 bg-indigo-50 rounded-2xl px-4 py-3 flex justify-between items-center">
            <div>
              <span className="text-indigo-700 font-semibold">ต้นทุนรวม</span>
              {stock.buyCommission != null && stock.buyCommission > 0 && (
                <p className="text-xs text-indigo-400">มูลค่าหุ้น {fmt(tradeCost)} + ค่าธรรมเนียม</p>
              )}
            </div>
            <span className="text-indigo-800 font-black text-xl">{fmt(totalCost)}</span>
          </div>
        </div>

        {/* Note */}
        {stock.note && (
          <div className="card">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">หมายเหตุ</p>
            <p className="text-slate-700 text-base leading-relaxed">{stock.note}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Sell — primary action */}
          <button
            onClick={() => setShowSell(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-white active:opacity-80"
            style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)', boxShadow: '0 4px 14px rgba(225,29,72,0.35)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            บันทึกการขาย
          </button>

          {/* Edit + Delete */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base border-2 border-indigo-200 text-indigo-600 bg-indigo-50 active:bg-indigo-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              แก้ไข
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base border-2 border-slate-200 text-slate-500 bg-slate-50 active:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ลบ
            </button>
          </div>
        </div>
      </div>

      {showSell && (
        <SellModal
          stock={stock}
          onSell={handleSell}
          onClose={() => setShowSell(false)}
        />
      )}

      {showEdit && (
        <StockFormModal
          initial={stock}
          defaultCategory={stock.category}
          onSave={handleSaveEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-3 text-3xl">🗑️</div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">ยืนยันการลบ</h3>
              <p className="text-slate-500">ลบหุ้น <strong>{stock.ticker}</strong> ออกจากพอร์ต?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmDelete(false)} className="flex-1 btn-secondary">ยกเลิก</button>
              <button onClick={handleDelete}
                className="flex-1 py-3.5 rounded-2xl font-bold text-lg text-white active:opacity-80"
                style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)' }}>
                ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
