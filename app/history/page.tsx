'use client';

import { useEffect, useState } from 'react';
import { getSellTransactions, getStocks } from '@/lib/storage';
import { SellTransaction, Stock } from '@/lib/types';
import { calculateStockValue } from '@/lib/stockCalculation';
import { getSavedCurrency, getSavedRate, saveCurrency, Currency, convert, fmt } from '@/lib/currency';

type YearEntry = {
  year: number;
  // Buys (by purchaseDate year) — includes held + sold positions purchased that year
  buyTotal: number;
  holdCount: number;
  holdValue: number;
  holdProfit: number;
  // Sells (by sellDate year)
  sellCount: number;
  sellProceeds: number;
  sellCostBasis: number;
  sellProfit: number;
};

function blank(year: number): YearEntry {
  return { year, buyTotal: 0, holdCount: 0, holdValue: 0, holdProfit: 0, sellCount: 0, sellProceeds: 0, sellCostBasis: 0, sellProfit: 0 };
}

function getYear(dateStr: string) {
  return new Date(dateStr).getFullYear();
}

export default function HistoryPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sells, setSells] = useState<SellTransaction[]>([]);
  const [currency, setCurrency] = useState<Currency>('THB');
  const [rate, setRate] = useState(35);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStocks(getStocks());
    setSells(getSellTransactions());
    setCurrency(getSavedCurrency());
    setRate(getSavedRate());
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  function toCur(amount: number, category: 'us' | 'thai' | 'fund'): number {
    return convert(amount, category === 'us' ? 'USD' : 'THB', currency, rate);
  }

  // Build year map
  const yearMap = new Map<number, YearEntry>();
  function entry(year: number): YearEntry {
    if (!yearMap.has(year)) yearMap.set(year, blank(year));
    return yearMap.get(year)!;
  }

  // Current holdings → by purchase year
  for (const stock of stocks) {
    const e = entry(getYear(stock.purchaseDate));
    const { totalCost, currentValue, profitLoss } = calculateStockValue(stock);
    e.buyTotal += toCur(totalCost, stock.category);
    e.holdCount++;
    e.holdValue += toCur(currentValue, stock.category);
    e.holdProfit += toCur(profitLoss, stock.category);
  }

  // Sell transactions → purchase year for buyTotal, sell year for realized
  for (const tx of sells) {
    entry(getYear(tx.purchaseDate)).buyTotal += toCur(tx.costBasis, tx.category);

    const se = entry(getYear(tx.sellDate));
    se.sellCount++;
    se.sellProceeds += toCur(tx.proceeds, tx.category);
    se.sellCostBasis += toCur(tx.costBasis, tx.category);
    se.sellProfit += toCur(tx.netProfit ?? tx.profit, tx.category);
  }

  const allYears = Array.from(yearMap.values()).sort((a, b) => b.year - a.year);

  // Lifetime totals
  const lifetimeBuyTotal = stocks.reduce((s, st) => {
    const { totalCost } = calculateStockValue(st);
    return s + toCur(totalCost, st.category);
  }, 0) + sells.reduce((s, tx) => s + toCur(tx.costBasis, tx.category), 0);

  const lifetimeRealized = sells.reduce((s, tx) => s + toCur(tx.netProfit ?? tx.profit, tx.category), 0);
  const lifetimeUnrealized = stocks.reduce((s, st) => {
    const { profitLoss } = calculateStockValue(st);
    return s + toCur(profitLoss, st.category);
  }, 0);
  const lifetimePL = lifetimeRealized + lifetimeUnrealized;

  const hasAny = stocks.length > 0 || sells.length > 0;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F9FF 100%)' }}>

      {/* Header */}
      <div className="px-5 pt-page-header pb-6 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #4F46E5 60%, #7C3AED 100%)' }}>
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white">ภาพรวมต่อปี</h1>
              <p className="text-indigo-200 text-sm mt-1">ประวัติการลงทุนทั้งหมด</p>
            </div>
            <div className="flex bg-white/15 rounded-2xl p-1 gap-1 border border-white/20">
              {(['THB', 'USD'] as Currency[]).map((c) => (
                <button key={c}
                  onClick={() => { setCurrency(c); saveCurrency(c); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                    currency === c ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/80 active:bg-white/20'
                  }`}>
                  {c === 'THB' ? '฿ THB' : '$ USD'}
                </button>
              ))}
            </div>
          </div>

          {hasAny && (
            <div className="bg-white/15 rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-indigo-200 text-xs font-medium mb-0.5">กำไร/ขาดทุนรวมทั้งหมด</p>
              <p className={`text-3xl font-black ${lifetimePL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmt(lifetimePL, currency, true)}
              </p>
              <p className="text-indigo-200 text-xs mt-1">จากเงินลงทุนรวม {fmt(lifetimeBuyTotal, currency)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4 pb-8">

        {/* Lifetime summary */}
        {hasAny && (
          <div className="card">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">ภาพรวมตลอดทุกปี</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'ลงทุนรวม', val: fmt(lifetimeBuyTotal, currency), color: 'text-slate-800' },
                { label: 'กำไรที่ขายแล้ว', val: fmt(lifetimeRealized, currency, true), color: lifetimeRealized >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { label: 'กำไรที่ถืออยู่', val: fmt(lifetimeUnrealized, currency, true), color: lifetimeUnrealized >= 0 ? 'text-emerald-600' : 'text-rose-600' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className={`text-sm font-bold leading-tight ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-2 rounded-full ${lifetimePL >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                   style={{ width: `${lifetimeBuyTotal > 0 ? Math.min(100, (Math.abs(lifetimePL) / lifetimeBuyTotal) * 100) : 0}%` }} />
            </div>
            <p className={`text-xs mt-1 text-right font-semibold ${lifetimePL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {lifetimeBuyTotal > 0 ? `${lifetimePL >= 0 ? '+' : ''}${((lifetimePL / lifetimeBuyTotal) * 100).toFixed(2)}%` : '—'}
            </p>
          </div>
        )}

        {/* Per-year cards */}
        {allYears.map((e) => {
          const hasBuys = e.buyTotal > 0;
          const hasSells = e.sellCount > 0;
          const yearPL = e.holdProfit + e.sellProfit;

          return (
            <div key={e.year} className="card space-y-3">
              {/* Year header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm">{e.year}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{e.year}</p>
                    <p className="text-xs text-slate-400">
                      {[hasBuys && `ซื้อ ${e.holdCount} รายการ`, hasSells && `ขาย ${e.sellCount} ครั้ง`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">รวมปีนี้</p>
                  <p className={`font-black text-lg ${yearPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmt(yearPL, currency, true)}
                  </p>
                </div>
              </div>

              {/* Buy section */}
              {hasBuys && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">ซื้อในปีนี้</p>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-sm">ลงทุนรวม</span>
                    <span className="font-bold text-slate-800">{fmt(e.buyTotal, currency)}</span>
                  </div>
                  {e.holdCount > 0 ? (
                    <>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500 text-sm">มูลค่าปัจจุบัน ({e.holdCount} รายการ)</span>
                        <span className="font-bold text-slate-800">{fmt(e.holdValue, currency)}</span>
                      </div>
                      <div className={`flex justify-between font-bold pt-2 border-t border-slate-200 ${e.holdProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <span className="text-sm">กำไร/ขาดทุนที่ยังถืออยู่</span>
                        <span>{fmt(e.holdProfit, currency, true)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 pt-1 border-t border-slate-200">ขายออกทั้งหมดแล้ว</p>
                  )}
                </div>
              )}

              {/* Sell section */}
              {hasSells && (
                <div className={`rounded-2xl p-4 border-2 ${e.sellProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">ขายในปีนี้ ({e.sellCount} ครั้ง)</p>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500 text-sm">ต้นทุนที่ขาย</span>
                    <span className="font-bold text-slate-800">{fmt(e.sellCostBasis, currency)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-sm">รายรับจากการขาย</span>
                    <span className="font-bold text-slate-800">{fmt(e.sellProceeds, currency)}</span>
                  </div>
                  <div className={`flex justify-between font-bold pt-2 border-t ${e.sellProfit >= 0 ? 'border-emerald-200 text-emerald-600' : 'border-rose-200 text-rose-600'}`}>
                    <span className="text-sm">กำไร/ขาดทุนที่ขายแล้ว</span>
                    <span>{fmt(e.sellProfit, currency, true)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Sell transaction list */}
        {sells.length > 0 && (
          <div className="card">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">รายการขายทั้งหมด</p>
            <div className="space-y-0">
              {[...sells].reverse().map((tx) => {
                const net = tx.netProfit ?? tx.profit;
                const isP = net >= 0;
                const f = (v: number) => fmt(toCur(v, tx.category), currency);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                         style={{ background: tx.category === 'us' ? '#EEF2FF' : tx.category === 'thai' ? '#FFF1F2' : '#F5F3FF' }}>
                      {tx.category === 'us' ? '🇺🇸' : tx.category === 'thai' ? '🇹🇭' : '🏦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{tx.ticker}</p>
                      <p className="text-xs text-slate-400">{tx.sellDate} · ต้นทุน {f(tx.costBasis)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${isP ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isP ? '+' : ''}{f(net)}
                      </p>
                      <p className="text-xs text-slate-400">รับ {f(tx.proceeds)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasAny && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl">📅</div>
            <p className="text-slate-500 text-lg font-semibold">ยังไม่มีประวัติการลงทุน</p>
            <p className="text-slate-400 text-sm text-center">เพิ่มหุ้นหรือกองทุนในหน้า "หุ้น" ก่อนนะ</p>
          </div>
        )}
      </div>
    </div>
  );
}
