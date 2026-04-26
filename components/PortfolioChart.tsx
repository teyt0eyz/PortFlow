'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Stock } from '@/lib/types';
import { calculateStockValue } from '@/lib/stockCalculation';
import { Currency, convert, fmt } from '@/lib/currency';

const CAT_COLORS: Record<string, string> = {
  us: '#4F46E5',
  thai: '#F43F5E',
  fund: '#7C3AED',
};

const STOCK_PALETTE = [
  '#4F46E5', '#7C3AED', '#F43F5E', '#059669',
  '#D97706', '#0EA5E9', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#14B8A6', '#EF4444',
];

interface ChartItem {
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface Props {
  stocks: Stock[];
  currency: Currency;
  rate: number;
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartItem }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-100">
      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
      <p className="text-indigo-600 font-bold text-base">{fmt(item.value, item as unknown as Currency)}</p>
      <p className="text-slate-400 text-xs mt-0.5">{item.percent.toFixed(1)}%</p>
    </div>
  );
}

export default function PortfolioChart({ stocks, currency, rate }: Props) {
  const [viewMode, setViewMode] = useState<'category' | 'stock'>('category');

  function toC(amount: number, category: 'us' | 'thai' | 'fund'): number {
    return convert(amount, category === 'us' ? 'USD' : 'THB', currency, rate);
  }

  // Per-stock values
  const stockItems = stocks
    .map((stock, i) => {
      const { currentValue } = calculateStockValue(stock);
      return {
        name: stock.ticker,
        label: stock.name !== stock.ticker ? stock.name : stock.ticker,
        value: toC(currentValue, stock.category),
        color: STOCK_PALETTE[i % STOCK_PALETTE.length],
        category: stock.category,
      };
    })
    .filter((d) => d.value > 0);

  // Category totals
  const catTotals: Record<string, number> = { us: 0, thai: 0, fund: 0 };
  for (const d of stockItems) catTotals[d.category] += d.value;

  const catLabels: Record<string, string> = {
    us: '🇺🇸 หุ้นสหรัฐ',
    thai: '🇹🇭 หุ้นไทย',
    fund: '🏦 กองทุนรวม',
  };

  const categoryItems = Object.entries(catTotals)
    .filter(([, v]) => v > 0)
    .map(([key, v]) => ({
      name: catLabels[key],
      value: v,
      color: CAT_COLORS[key],
    }));

  const rawData = viewMode === 'category'
    ? categoryItems
    : stockItems.map((d) => ({ name: d.name, value: d.value, color: d.color }));

  const total = rawData.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  const data: ChartItem[] = rawData.map((d) => ({
    ...d,
    percent: (d.value / total) * 100,
  }));

  const renderTooltip = (props: unknown) => {
    const { active, payload } = props as { active?: boolean; payload?: Array<{ payload: ChartItem }> };
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-100">
        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
        <p className="text-indigo-600 font-bold text-base">{fmt(item.value, currency)}</p>
        <p className="text-slate-400 text-xs mt-0.5">{item.percent.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">สัดส่วนพอร์ต</h2>
        <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
          {(['category', 'stock'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              {mode === 'category' ? 'หมวด' : 'หุ้น'}
            </button>
          ))}
        </div>
      </div>

      {/* Donut chart */}
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={data.length > 1 ? 2 : 0}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={renderTooltip} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-slate-400 font-medium">มูลค่ารวม</p>
          <p className="text-lg font-black text-slate-800 leading-tight">{fmt(total, currency)}</p>
          {currency === 'THB' && (
            <p className="text-xs text-slate-400 mt-0.5">{stocks.length} รายการ</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-sm text-slate-600 flex-1 truncate">{item.name}</span>
            <div className="text-right flex-shrink-0">
              <span className="text-sm font-bold text-slate-800">{fmt(item.value, currency)}</span>
              <span className="text-xs text-slate-400 ml-2">{item.percent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="mt-4 space-y-1.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${item.percent}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
