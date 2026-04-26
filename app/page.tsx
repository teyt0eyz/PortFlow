'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStocks } from '@/lib/storage';
import { Stock } from '@/lib/types';
import { summarizeStocks } from '@/lib/stockCalculation';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: 'blue' | 'green' | 'red' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };
  return (
    <div className={`${colors[color]} rounded-2xl p-4 text-white`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-2xl font-bold mt-1 leading-tight">{value}</p>
      {sub && <p className="text-sm opacity-80 mt-1">{sub}</p>}
    </div>
  );
}

export default function HomePage() {
  const [usStocks, setUsStocks] = useState<Stock[]>([]);
  const [thaiStocks, setThaiStocks] = useState<Stock[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const all = getStocks();
    setUsStocks(all.filter((s) => s.category === 'us'));
    setThaiStocks(all.filter((s) => s.category === 'thai'));
    setMounted(true);
  }, []);

  const usSummary = summarizeStocks(usStocks);
  const thaiSummary = summarizeStocks(thaiStocks);

  const totalStocks = usStocks.length + thaiStocks.length;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-5 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-blue-600 text-xl font-black">P</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">PortFlow</h1>
            <p className="text-sm opacity-80">บันทึกการลงทุนของคุณ</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Portfolio Overview */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-600 mb-3">ภาพรวมพอร์ต</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="หุ้นสหรัฐทั้งหมด"
              value={`${usStocks.length} ตัว`}
              sub={usStocks.length > 0 ? (usSummary.profitLoss >= 0 ? `+${formatUSD(usSummary.profitLoss)}` : formatUSD(usSummary.profitLoss)) : undefined}
              color={usSummary.profitLoss >= 0 ? 'blue' : 'orange'}
            />
            <StatCard
              label="หุ้นไทยทั้งหมด"
              value={`${thaiStocks.length} ตัว`}
              sub={thaiStocks.length > 0 ? (thaiSummary.profitLoss >= 0 ? `+${formatTHB(thaiSummary.profitLoss)}` : formatTHB(thaiSummary.profitLoss)) : undefined}
              color={thaiSummary.profitLoss >= 0 ? 'green' : 'red'}
            />
          </div>
        </div>

        {/* US Stocks Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇺🇸</span>
              <h2 className="text-xl font-bold text-gray-800">หุ้นสหรัฐ</h2>
            </div>
            <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
              {usStocks.length} ตัว
            </span>
          </div>
          {usStocks.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">มูลค่าตลาด</span>
                <span className="font-bold text-lg">{formatUSD(usSummary.currentValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">ต้นทุน</span>
                <span className="font-semibold text-base">{formatUSD(usSummary.totalCost)}</span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">กำไร/ขาดทุน</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${usSummary.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {usSummary.profitLoss >= 0 ? '+' : ''}{formatUSD(usSummary.profitLoss)}
                  </span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                    usSummary.profitLoss >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {usSummary.profitLoss >= 0 ? '+' : ''}{usSummary.profitLossPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">ยังไม่มีหุ้น</p>
          )}
          <Link href="/stocks?tab=us" className="mt-3 flex items-center justify-center gap-2 text-blue-600 font-semibold text-base py-2 border-2 border-blue-100 rounded-xl active:bg-blue-50">
            <span>ดูทั้งหมด</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Thai Stocks Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇹🇭</span>
              <h2 className="text-xl font-bold text-gray-800">หุ้นไทย</h2>
            </div>
            <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
              {thaiStocks.length} ตัว
            </span>
          </div>
          {thaiStocks.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">มูลค่าตลาด</span>
                <span className="font-bold text-lg">{formatTHB(thaiSummary.currentValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">ต้นทุน</span>
                <span className="font-semibold text-base">{formatTHB(thaiSummary.totalCost)}</span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">กำไร/ขาดทุน</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${thaiSummary.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {thaiSummary.profitLoss >= 0 ? '+' : ''}{formatTHB(thaiSummary.profitLoss)}
                  </span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                    thaiSummary.profitLoss >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {thaiSummary.profitLoss >= 0 ? '+' : ''}{thaiSummary.profitLossPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">ยังไม่มีหุ้น</p>
          )}
          <Link href="/stocks?tab=thai" className="mt-3 flex items-center justify-center gap-2 text-blue-600 font-semibold text-base py-2 border-2 border-blue-100 rounded-xl active:bg-blue-50">
            <span>ดูทั้งหมด</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link href="/stocks" className="card flex flex-col items-center justify-center py-5 gap-2 active:bg-blue-50 transition-colors">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-bold text-gray-700 text-base">เพิ่มหุ้น</span>
          </Link>
          <Link href="/tax" className="card flex flex-col items-center justify-center py-5 gap-2 active:bg-green-50 transition-colors">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-700 text-base">คำนวณภาษี</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
