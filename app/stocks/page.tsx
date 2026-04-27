'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStocks, addStock } from '@/lib/storage';
import { Stock } from '@/lib/types';
import { calculateStockValue } from '@/lib/stockCalculation';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';
import { summarizeStocks } from '@/lib/stockCalculation';
import StockFormModal from '@/components/StockFormModal';

function CompactStockCard({ stock }: { stock: Stock }) {
  const { profitLoss, profitLossPercent, totalCost } = calculateStockValue(stock);
  const fmt = stock.category === 'us' ? formatUSD : formatTHB;
  const isProfit = profitLoss >= 0;

  return (
    <Link
      href={`/stocks/${stock.id}`}
      className="bg-white rounded-2xl px-4 py-3.5 mb-2.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
      style={{ boxShadow: '0 2px 12px rgba(79,70,229,0.06)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
           style={{ background: stock.category === 'us' ? '#EEF2FF' : '#FFF1F2' }}>
        {stock.category === 'us' ? '🇺🇸' : '🇹🇭'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-bold text-slate-800 truncate">{stock.ticker}</span>
          <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
            isProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
          }`}>
            {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-slate-400 text-sm">ลงทุน {fmt(totalCost)}</span>
          <span className={`text-sm font-semibold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isProfit ? '+' : ''}{fmt(profitLoss)}
          </span>
        </div>
      </div>

      <div className="w-7 h-7 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function SummaryBar({ stocks }: { stocks: Stock[] }) {
  const { totalCost, currentValue, profitLoss, profitLossPercent } = summarizeStocks(stocks);
  if (stocks.length === 0) return null;
  const fmt = stocks[0]?.category === 'us' ? formatUSD : formatTHB;
  const isProfit = profitLoss >= 0;

  return (
    <div className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-center justify-between"
         style={{ background: isProfit ? '#ECFDF5' : '#FFF1F2' }}>
      <div>
        <p className="text-xs text-slate-500 font-medium">ลงทุนรวม</p>
        <p className="font-bold text-slate-800 text-base">{fmt(totalCost)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500 font-medium">กำไร / ขาดทุน</p>
        <p className={`font-black text-lg ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
          {fmt(profitLoss, )} {isProfit ? '▲' : '▼'} {Math.abs(profitLossPercent).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

function StocksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'us' | 'thai' | 'fund'>(
    tabParam === 'thai' ? 'thai' : tabParam === 'fund' ? 'fund' : 'us'
  );
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setStocks(getStocks()); setMounted(true); }, []);

  useEffect(() => {
    if (tabParam === 'thai') setActiveTab('thai');
    else if (tabParam === 'fund') setActiveTab('fund');
    else if (tabParam === 'us') setActiveTab('us');
  }, [tabParam]);

  const filtered = stocks.filter((s) => s.category === activeTab);

  async function handleRefreshAll() {
    if (filtered.length === 0) return;
    setRefreshing(true);
    const { updateStock } = await import('@/lib/storage');
    const updated = [...stocks];
    await Promise.all(
      filtered.map(async (stock) => {
        try {
          const res = await fetch(`/api/stock-price?ticker=${encodeURIComponent(stock.ticker)}&category=${stock.category}`);
          if (!res.ok) return;
          const data = await res.json();
          const idx = updated.findIndex((s) => s.id === stock.id);
          if (idx !== -1) { updated[idx] = { ...updated[idx], currentPrice: data.price }; updateStock(updated[idx]); }
        } catch { /* skip */ }
      })
    );
    setStocks([...updated]);
    setLastRefresh(new Date().toLocaleTimeString('th-TH'));
    setRefreshing(false);
  }

  function handleSave(data: Omit<Stock, 'id'>) {
    addStock(data);
    setStocks(getStocks());
    setShowModal(false);
  }

  function switchTab(tab: 'us' | 'thai' | 'fund') {
    setActiveTab(tab);
    router.replace(`/stocks?tab=${tab}`, { scroll: false });
  }

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F9FF 100%)' }}>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 pt-page-header pb-0 sticky top-0 z-10"
           style={{ boxShadow: '0 2px 20px rgba(79,70,229,0.06)' }}>
        <div className="flex items-center justify-between pb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">พอร์ตหุ้น</h1>
            {lastRefresh && <p className="text-xs text-emerald-600 mt-0.5">อัปเดตเมื่อ {lastRefresh}</p>}
          </div>
          {filtered.length > 0 && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm border-2 transition-all ${
                refreshing ? 'border-slate-200 text-slate-300' : 'border-indigo-200 text-indigo-600 bg-indigo-50 active:bg-indigo-100'
              }`}
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'กำลังดึง...' : 'อัปเดตราคา'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(['us', 'thai', 'fund'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold text-sm rounded-t-2xl transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{tab === 'us' ? '🇺🇸' : tab === 'thai' ? '🇹🇭' : '🏦'}</span>
              {tab === 'us' ? 'สหรัฐ' : tab === 'thai' ? 'ไทย' : 'กองทุน'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="pt-3">
        <SummaryBar stocks={filtered} />
      </div>

      {/* Stock List */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl">📊</div>
            <p className="text-slate-400 text-lg font-medium">
              {activeTab === 'us' ? 'ยังไม่มีหุ้นสหรัฐ' : activeTab === 'thai' ? 'ยังไม่มีหุ้นไทย' : 'ยังไม่มีกองทุนรวม'}
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มหุ้น
            </button>
          </div>
        ) : (
          filtered.map((stock) => <CompactStockCard key={stock.id} stock={stock} />)
        )}
      </div>

      {/* FAB */}
      {filtered.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed z-40 w-16 h-16 text-white rounded-full flex items-center justify-center active:opacity-80 transition-opacity"
          style={{
            bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 12px))',
            right: '16px',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            boxShadow: '0 6px 24px rgba(79,70,229,0.45)',
          }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {showModal && (
        <StockFormModal
          initial={null}
          defaultCategory={activeTab}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StocksContent />
    </Suspense>
  );
}
