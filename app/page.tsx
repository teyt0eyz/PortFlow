'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStocks, getTargetAllocation, saveTargetAllocation, TargetAllocation } from '@/lib/storage';
import { Stock } from '@/lib/types';
import { summarizeStocks } from '@/lib/stockCalculation';
import {
  Currency, getSavedCurrency, saveCurrency,
  getSavedRate, saveRate, getRateUpdatedAt, fetchLatestRate, convert, fmt,
} from '@/lib/currency';
import dynamic from 'next/dynamic';
const PortfolioChart = dynamic(() => import('@/components/PortfolioChart'), { ssr: false });

export default function HomePage() {
  const [usStocks, setUsStocks] = useState<Stock[]>([]);
  const [thaiStocks, setThaiStocks] = useState<Stock[]>([]);
  const [fundStocks, setFundStocks] = useState<Stock[]>([]);
  const [currency, setCurrency] = useState<Currency>('THB');
  const [rate, setRate] = useState(35);
  const [rateUpdatedAt, setRateUpdatedAt] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<TargetAllocation>({ us: 34, thai: 33, fund: 33 });
  const [showInsight, setShowInsight] = useState(false);

  useEffect(() => {
    const all = getStocks();
    setUsStocks(all.filter((s) => s.category === 'us'));
    setThaiStocks(all.filter((s) => s.category === 'thai'));
    setFundStocks(all.filter((s) => s.category === 'fund'));
    setCurrency(getSavedCurrency());
    setRate(getSavedRate());
    setRateUpdatedAt(getRateUpdatedAt());
    setTarget(getTargetAllocation());
    setMounted(true);
  }, []);

  function updateTarget(key: keyof TargetAllocation, delta: number) {
    const next = { ...target, [key]: Math.max(0, Math.min(100, target[key] + delta)) };
    setTarget(next);
    saveTargetAllocation(next);
  }

  async function refreshRate() {
    setFetchingRate(true);
    try {
      const r = await fetchLatestRate();
      setRate(r);
      saveRate(r);
      setRateUpdatedAt(getRateUpdatedAt());
    } catch { /* keep old rate */ }
    setFetchingRate(false);
  }

  function toggleCurrency(c: Currency) {
    setCurrency(c);
    saveCurrency(c);
  }

  const usSummary   = summarizeStocks(usStocks);
  const thaiSummary = summarizeStocks(thaiStocks);
  const fundSummary = summarizeStocks(fundStocks);

  const usCost    = convert(usSummary.totalCost,       'USD', currency, rate);
  const usValue   = convert(usSummary.currentValue,    'USD', currency, rate);
  const usPL      = convert(usSummary.profitLoss,      'USD', currency, rate);
  const thaiCost  = convert(thaiSummary.totalCost,     'THB', currency, rate);
  const thaiValue = convert(thaiSummary.currentValue,  'THB', currency, rate);
  const thaiPL    = convert(thaiSummary.profitLoss,    'THB', currency, rate);
  const fundCost  = convert(fundSummary.totalCost,     'THB', currency, rate);
  const fundValue = convert(fundSummary.currentValue,  'THB', currency, rate);
  const fundPL    = convert(fundSummary.profitLoss,    'THB', currency, rate);

  const totalCost  = usCost + thaiCost + fundCost;
  const totalValue = usValue + thaiValue + fundValue;
  const totalPL    = usPL + thaiPL + fundPL;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const hasStocks  = usStocks.length + thaiStocks.length + fundStocks.length > 0;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F9FF 100%)' }}>

      {/* ── Header ── */}
      <div
        className="px-5 pt-page-header pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4338CA 0%, #4F46E5 50%, #6366F1 100%)' }}
      >
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #A5B4FC, transparent)' }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #C7D2FE, transparent)' }} />

        {/* Logo row */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
              <span className="text-white text-xl font-black">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">PortFlow</h1>
              <p className="text-indigo-200 text-xs font-medium">บันทึกการลงทุน</p>
            </div>
          </div>

          {/* Currency toggle */}
          <div className="flex bg-white/15 rounded-2xl p-1 gap-1 backdrop-blur-sm border border-white/20">
            {(['THB', 'USD'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => toggleCurrency(c)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  currency === c
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-white/80 active:bg-white/20'
                }`}
              >
                {c === 'THB' ? '฿ THB' : '$ USD'}
              </button>
            ))}
          </div>
        </div>

        {/* Big total P/L when has stocks */}
        {hasStocks && (
          <div className="relative mb-5">
            <p className="text-indigo-200 text-sm font-medium mb-1">กำไร / ขาดทุนรวม</p>
            <p className={`text-4xl font-black text-white`}>
              {fmt(totalPL, currency, true)}
            </p>
            <p className={`text-base font-semibold mt-1 ${totalPL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {totalPL >= 0 ? '▲' : '▼'} {Math.abs(totalPLPct).toFixed(2)}% จากต้นทุนทั้งหมด
            </p>
          </div>
        )}

        {/* Exchange Rate pill */}
        <div className="flex items-center justify-between bg-white/15 rounded-2xl px-4 py-2.5 backdrop-blur-sm border border-white/20 relative">
          <div>
            <p className="text-indigo-200 text-xs">อัตราแลกเปลี่ยน</p>
            <p className="text-white font-bold text-base">1 USD = ฿{rate.toFixed(2)}</p>
            {rateUpdatedAt && <p className="text-indigo-300 text-xs">{rateUpdatedAt}</p>}
          </div>
          <button
            onClick={refreshRate}
            disabled={fetchingRate}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-white text-sm font-semibold active:bg-white/10 transition-colors border border-white/20"
          >
            <svg className={`w-4 h-4 ${fetchingRate ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {fetchingRate ? '...' : 'อัปเดต'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 -mt-3 space-y-4 pb-6">

        {/* Total Summary */}
        {hasStocks && (
          <div className="card">
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">ภาพรวมพอร์ต</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'ลงทุนรวม', val: fmt(totalCost, currency), color: 'text-slate-800' },
                { label: 'มูลค่าวันนี้', val: fmt(totalValue, currency), color: 'text-slate-800' },
                { label: 'กำไร/ขาดทุน', val: fmt(totalPL, currency, true), color: totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className={`text-sm font-bold leading-tight ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${totalPL >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                style={{ width: `${Math.min(100, Math.abs(totalPLPct))}%` }}
              />
            </div>
            <p className={`text-xs mt-1 text-right font-semibold ${totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalPL >= 0 ? '+' : ''}{totalPLPct.toFixed(2)}%
            </p>
          </div>
        )}

        {/* Portfolio chart */}
        {hasStocks && (
          <PortfolioChart
            stocks={[...usStocks, ...thaiStocks, ...fundStocks]}
            currency={currency}
            rate={rate}
          />
        )}

        {/* Target Allocation Insight */}
        {hasStocks && (() => {
          const totalVal = totalValue || 1;
          const curUs   = (usValue / totalVal) * 100;
          const curThai = (thaiValue / totalVal) * 100;
          const curFund = (fundValue / totalVal) * 100;
          const totalTarget = target.us + target.thai + target.fund;

          const categories = [
            { key: 'us' as keyof TargetAllocation, label: 'หุ้น US', flag: '🇺🇸', color: '#4F46E5', cur: curUs, val: usValue },
            { key: 'thai' as keyof TargetAllocation, label: 'หุ้น ไทย', flag: '🇹🇭', color: '#0EA5E9', cur: curThai, val: thaiValue },
            { key: 'fund' as keyof TargetAllocation, label: 'กองทุน', flag: '🏦', color: '#7C3AED', cur: curFund, val: fundValue },
          ];

          return (
            <div className="card">
              <button onClick={() => setShowInsight(!showInsight)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #4338CA, #7C3AED)' }}>
                    <span>🎯</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">เป้าหมายพอร์ต</p>
                    <p className="text-xs text-slate-400">ตั้งสัดส่วนและดูคำแนะนำ</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${showInsight ? 'rotate-180' : ''}`}
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showInsight && (
                <div className="mt-4 space-y-4">
                  {totalTarget !== 100 && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl font-medium">
                      รวมเป้าหมาย {totalTarget}% — ควรเท่ากับ 100%
                    </p>
                  )}

                  {categories.map(({ key, label, flag, color, cur, val }) => {
                    const tgt = target[key];
                    const diff = totalValue > 0 ? (tgt / 100) * totalValue - val : 0;
                    const isOver = diff < -totalValue * 0.01;
                    const isUnder = diff > totalValue * 0.01;

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{flag}</span>
                            <span className="font-semibold text-slate-700 text-sm">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateTarget(key, -5)}
                              className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-bold active:bg-slate-200 text-sm">
                              −
                            </button>
                            <span className="w-10 text-center font-black text-slate-800 text-base">{tgt}%</span>
                            <button onClick={() => updateTarget(key, 5)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold active:opacity-70 text-sm"
                              style={{ background: color }}>
                              +
                            </button>
                          </div>
                        </div>

                        {/* Bar: current vs target */}
                        <div className="relative h-3 bg-slate-100 rounded-full overflow-visible">
                          <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                               style={{ width: `${Math.min(100, cur)}%`, background: color, opacity: 0.35 }} />
                          <div className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full shadow"
                               style={{ left: `${Math.min(99, tgt)}%` }} />
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">ปัจจุบัน <span className="font-semibold text-slate-600">{cur.toFixed(1)}%</span></span>
                          {isUnder && (
                            <span className="font-semibold text-emerald-600">ซื้อเพิ่ม {fmt(diff, currency)}</span>
                          )}
                          {isOver && (
                            <span className="font-semibold text-amber-600">เกินเป้า {fmt(Math.abs(diff), currency)}</span>
                          )}
                          {!isUnder && !isOver && totalValue > 0 && (
                            <span className="font-semibold text-indigo-500">ตรงเป้า</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* US Stocks Card */}
        <PortfolioCard
          flag="🇺🇸"
          title="หุ้นสหรัฐ"
          count={usStocks.length}
          cost={usCost}
          value={usValue}
          pl={usPL}
          plPct={usSummary.profitLossPercent}
          currency={currency}
          href="/stocks?tab=us"
          accentColor="#4F46E5"
        />

        {/* Thai Stocks Card */}
        <PortfolioCard
          flag="🇹🇭"
          title="หุ้นไทย"
          count={thaiStocks.length}
          cost={thaiCost}
          value={thaiValue}
          pl={thaiPL}
          plPct={thaiSummary.profitLossPercent}
          currency={currency}
          href="/stocks?tab=thai"
          accentColor="#0EA5E9"
        />

        {/* Fund Card */}
        <PortfolioCard
          flag="🏦"
          title="กองทุนรวม"
          count={fundStocks.length}
          cost={fundCost}
          value={fundValue}
          pl={fundPL}
          plPct={fundSummary.profitLossPercent}
          currency={currency}
          href="/stocks?tab=fund"
          accentColor="#7C3AED"
        />

        {/* Tax Calculator Link */}
        <Link href="/tax" className="card flex items-center gap-4 active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-lg">คำนวณภาษี</p>
            <p className="text-slate-400 text-sm">ภาษีเงินได้บุคคลธรรมดา 2567</p>
          </div>
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}

function PortfolioCard({
  flag, title, count, cost, value, pl, plPct, currency, href, accentColor,
}: {
  flag: string; title: string; count: number; cost: number; value: number;
  pl: number; plPct: number; currency: Currency; href: string; accentColor: string;
}) {
  const isProfit = pl >= 0;

  if (count === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{flag}</span>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">0 ตัว</span>
        </div>
        <p className="text-slate-400 text-center py-2">ยังไม่มีหุ้น</p>
        <Link href={href}
          className="mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base border-2 border-dashed border-slate-200 text-slate-400 active:bg-slate-50">
          + เพิ่มหุ้น
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{flag}</span>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${accentColor}18`, color: accentColor }}>
          {count} ตัว
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex justify-between text-base">
          <span className="text-slate-400">เงินที่ลงทุน</span>
          <span className="font-semibold text-slate-700">{fmt(cost, currency)}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-slate-400">มูลค่าปัจจุบัน</span>
          <span className="font-semibold text-slate-700">{fmt(value, currency)}</span>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-base">กำไร / ขาดทุน</span>
          <div className="text-right">
            <span className={`text-xl font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
              {fmt(pl, currency, true)}
            </span>
            <span className={`ml-2 text-sm font-bold px-2 py-0.5 rounded-full ${
              isProfit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {isProfit ? '+' : ''}{plPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <Link href={href}
        className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors active:opacity-70"
        style={{ background: `${accentColor}12`, color: accentColor }}>
        ดูรายการหุ้นทั้งหมด
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
