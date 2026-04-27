'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStocks, addStock, updateStock, deleteStock, addSellTransaction, generateId, removeLot, getDividends, addDividend, deleteDividend } from '@/lib/storage';
import { Stock, StockLot, SellTransaction, Dividend } from '@/lib/types';
import { calculateStockValue } from '@/lib/stockCalculation';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';
import StockFormModal from '@/components/StockFormModal';
import SellModal from '@/components/SellModal';
import DividendModal from '@/components/DividendModal';

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
  const [showBuyMore, setShowBuyMore] = useState(false);
  const [showDividend, setShowDividend] = useState(false);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [showAdc, setShowAdc] = useState(false);
  const [adcAmount, setAdcAmount] = useState('');
  const [adcPrice, setAdcPrice] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [confirmDeleteLot, setConfirmDeleteLot] = useState<string | null>(null);

  useEffect(() => {
    const found = getStocks().find((s) => s.id === params.id);
    if (!found) router.replace('/stocks');
    else {
      setStock(found);
      setDividends(getDividends().filter((d) => d.stockId === params.id));
    }
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
    const isMultiLot = stock.lots && stock.lots.length > 1;
    let updated: Stock;
    if (isMultiLot) {
      // Multi-lot: only update currentPrice and note; lots determine cost basis
      updated = { ...stock, currentPrice: data.currentPrice, note: data.note };
    } else {
      // Single lot: full edit, update the lot to stay in sync
      updated = {
        ...data, id: stock.id,
        lots: [{
          ...stock.lots![0],
          purchaseDate: data.purchaseDate,
          purchasePrice: data.purchasePrice,
          shares: data.shares,
          buyCommission: data.buyCommission,
        }],
      };
    }
    updateStock(updated);
    setStock(updated);
    setShowEdit(false);
  }

  function handleSaveDividend(data: Omit<Dividend, 'id'>) {
    const d: Dividend = { ...data, id: generateId() };
    addDividend(d);
    setDividends((prev) => [...prev, d]);
    setShowDividend(false);
  }

  function handleDeleteDividend(id: string) {
    deleteDividend(id);
    setDividends((prev) => prev.filter((d) => d.id !== id));
  }

  function handleBuyMore(data: Omit<Stock, 'id'>) {
    if (!stock) return;
    addStock(data);
    const updated = getStocks().find((s) => s.id === stock.id);
    if (updated) setStock(updated);
    setShowBuyMore(false);
  }

  function handleRemoveLot(lotId: string) {
    if (!stock) return;
    removeLot(stock.id, lotId);
    const updated = getStocks().find((s) => s.id === stock.id);
    if (!updated) router.replace(`/stocks?tab=${stock.category}`);
    else setStock(updated);
    setConfirmDeleteLot(null);
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
  const sym = stock.category === 'us' ? '$' : '฿';
  const unitLabel = stock.category === 'fund' ? 'หน่วย' : 'หุ้น';
  const isProfit = profitLoss >= 0;

  const adcAmountNum = Number(adcAmount) || 0;
  const adcPriceNum = Number(adcPrice) || 0;
  const adcShares = adcPriceNum > 0 ? adcAmountNum / adcPriceNum : 0;
  const newTotalShares = stock.shares + adcShares;
  const newTradeCost = tradeCost + adcAmountNum;
  const newAvgPrice = newTotalShares > 0 ? newTradeCost / newTotalShares : 0;
  const adcIsLower = adcAmountNum > 0 && adcPriceNum > 0 && newAvgPrice < stock.purchasePrice;

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
        <div className="px-4 pt-page-header pb-0">
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

      <div className="px-4 mt-4 space-y-4 pb-8">

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
          <InfoRow
            label={stock.lots && stock.lots.length > 1 ? 'วันที่ซื้อครั้งแรก' : 'วันที่ซื้อ'}
            value={stock.purchaseDate}
          />
          <InfoRow label={stock.category === 'fund' ? 'จำนวนหน่วย' : 'จำนวนหุ้น'}
            value={`${stock.shares % 1 === 0 ? stock.shares.toLocaleString('th-TH') : stock.shares.toFixed(4)} ${stock.category === 'fund' ? 'หน่วย' : 'หุ้น'}`} />
          <InfoRow
            label={stock.lots && stock.lots.length > 1 ? 'ราคาทุนเฉลี่ย / หุ้น' : 'ราคาซื้อ / หุ้น'}
            value={fmt(stock.purchasePrice)}
          />
          {stock.buyCommission != null && stock.buyCommission > 0 && (
            <InfoRow label="ค่าคอมมิชชั่นรวม" value={fmt(stock.buyCommission)} />
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

        {/* Purchase Lots — shown only when DCA (multiple lots) */}
        {stock.lots && stock.lots.length > 1 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-700">ประวัติการซื้อ</h2>
              <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2.5 py-1 rounded-full">
                {stock.lots.length} รอบ
              </span>
            </div>
            {stock.lots.map((lot: StockLot, i: number) => {
              const lotCost = lot.purchasePrice * lot.shares + (lot.buyCommission ?? 0);
              return (
                <div key={lot.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{lot.purchaseDate}</p>
                    <p className="text-xs text-slate-400">
                      {fmt(lot.purchasePrice)}/{unitLabel} × {lot.shares % 1 === 0 ? lot.shares.toLocaleString('th-TH') : lot.shares.toFixed(4)} {unitLabel}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{fmt(lotCost)}</p>
                      {lot.buyCommission ? (
                        <p className="text-xs text-slate-400">+ค่าธ. {fmt(lot.buyCommission)}</p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setConfirmDeleteLot(lot.id)}
                      className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center active:bg-rose-100 flex-shrink-0"
                    >
                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Note */}
        {stock.note && (
          <div className="card">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">หมายเหตุ</p>
            <p className="text-slate-700 text-base leading-relaxed">{stock.note}</p>
          </div>
        )}

        {/* Dividend History */}
        {dividends.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-700">ประวัติเงินปันผล</h2>
              <div className="text-right">
                <p className="text-xs text-slate-400">รับสุทธิรวม</p>
                <p className="font-black text-emerald-600 text-base">
                  {fmt(dividends.reduce((s, d) => s + d.netAmount, 0))}
                </p>
              </div>
            </div>
            {[...dividends].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                  💰
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{d.date}</p>
                  <p className="text-xs text-slate-400">
                    {fmt(d.amountPerShare)}/หุ้น × {d.shares % 1 === 0 ? d.shares.toLocaleString('th-TH') : d.shares.toFixed(4)}
                    {d.withholdingTaxRate > 0 ? ` · หัก ${d.withholdingTaxRate}%` : ''}
                  </p>
                  {d.note && <p className="text-xs text-slate-400 italic">{d.note}</p>}
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-bold text-emerald-600 text-sm">{fmt(d.netAmount)}</p>
                    {d.withholdingTax > 0 && (
                      <p className="text-xs text-slate-400">รวม {fmt(d.grossAmount)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDividend(d.id)}
                    className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center active:bg-rose-50 flex-shrink-0"
                  >
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Average Down Calculator */}
        <div className="card">
          <button
            onClick={() => setShowAdc(!showAdc)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
                🧮
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">คำนวณซื้อเพิ่ม</p>
                <p className="text-xs text-slate-400">Average Down / Average Up</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${showAdc ? 'rotate-180' : ''}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdc && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">เงินที่จะซื้อเพิ่ม ({sym})</label>
                  <input type="number" inputMode="decimal"
                    value={adcAmount}
                    onChange={(e) => setAdcAmount(e.target.value)}
                    placeholder="0.00" min="0"
                    className="input-field" />
                </div>
                <div>
                  <label className="label">ราคาที่จะซื้อ ({sym})</label>
                  <input type="number" inputMode="decimal"
                    value={adcPrice}
                    onChange={(e) => setAdcPrice(e.target.value)}
                    placeholder={String(stock.currentPrice)} min="0"
                    className="input-field" />
                </div>
              </div>

              {adcAmountNum > 0 && adcPriceNum > 0 && (
                <div className={`rounded-2xl p-4 border-2 ${adcIsLower ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">ผลที่จะได้</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-slate-400">จำนวนหลังซื้อ</p>
                      <p className="font-bold text-slate-800">
                        {newTotalShares % 1 === 0
                          ? newTotalShares.toLocaleString('th-TH')
                          : newTotalShares.toFixed(4)} {unitLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">ต้นทุนรวมใหม่</p>
                      <p className="font-bold text-slate-800">{fmt(newTradeCost)}</p>
                    </div>
                  </div>
                  <div className={`pt-3 border-t ${adcIsLower ? 'border-amber-200' : 'border-blue-200'} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">ราคาทุนเฉลี่ยใหม่</p>
                      <p className={`text-2xl font-black ${adcIsLower ? 'text-amber-600' : 'text-blue-600'}`}>
                        {fmt(newAvgPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">จากเดิม {fmt(stock.purchasePrice)}</p>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                        adcIsLower ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {adcIsLower ? '▼ ลดลง' : '▲ สูงขึ้น'}{' '}
                        {Math.abs(((newAvgPrice - stock.purchasePrice) / stock.purchasePrice) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Buy More (DCA) + Sell — side by side primary actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowBuyMore(true)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-white active:opacity-80"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              ซื้อเพิ่ม
            </button>
            <button
              onClick={() => setShowSell(true)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-white active:opacity-80"
              style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)', boxShadow: '0 4px 14px rgba(225,29,72,0.35)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ขาย
            </button>
          </div>

          {/* Dividend */}
          <button
            onClick={() => setShowDividend(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base border-2 border-emerald-200 text-emerald-700 bg-emerald-50 active:bg-emerald-100"
          >
            <span className="text-lg">💰</span>
            บันทึกเงินปันผล
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

      {showDividend && (
        <DividendModal
          stock={stock}
          onSave={handleSaveDividend}
          onClose={() => setShowDividend(false)}
        />
      )}

      {showBuyMore && (
        <StockFormModal
          initial={null}
          defaultCategory={stock.category}
          dcaFor={{ ticker: stock.ticker, name: stock.name, category: stock.category, currentPrice: stock.currentPrice }}
          onSave={handleBuyMore}
          onClose={() => setShowBuyMore(false)}
        />
      )}

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
              <p className="text-slate-500">ลบหุ้น <strong>{stock.ticker}</strong> ออกจากพอร์ตทั้งหมด?</p>
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

      {confirmDeleteLot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-3 text-3xl">📦</div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">ลบรอบซื้อนี้?</h3>
              <p className="text-slate-500 text-sm">ระบบจะคำนวณราคาทุนเฉลี่ยใหม่จากรอบที่เหลือ</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteLot(null)} className="flex-1 btn-secondary">ยกเลิก</button>
              <button
                onClick={() => handleRemoveLot(confirmDeleteLot)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-lg text-white active:opacity-80"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
              >
                ลบรอบนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
