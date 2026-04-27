'use client';

import { useEffect, useState } from 'react';
import { TaxInputData, TaxDeductions, SellTransaction } from '@/lib/types';
import { calculateTax, computeTax, formatTHB } from '@/lib/taxCalculation';
import { getTaxData, saveTaxData, getSellTransactions } from '@/lib/storage';

const DEFAULT_DEDUCTIONS: TaxDeductions = {
  lifeInsurance: 0,
  healthInsurance: 0,
  pvdContribution: 0,
  ssfAmount: 0,
  rmfAmount: 0,
  mortgageInterest: 0,
  parentsCount: 0,
  childrenCount: 0,
  hasSpouse: false,
  donations: 0,
  socialSecurity: 0,
};

const DEFAULT_INPUT: TaxInputData = {
  monthlyIncome: 0,
  otherIncome: 0,
  deductions: { ...DEFAULT_DEDUCTIONS },
};

function DeductionRow({
  label,
  sub,
  cap,
  value,
  onChange,
  type = 'currency',
  max,
}: {
  label: string;
  sub?: string;
  cap?: string;
  value: number;
  onChange: (v: number) => void;
  type?: 'currency' | 'count';
  max?: number;
}) {
  return (
    <div className="py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-slate-700 text-base">{label}</p>
          {sub && <p className="text-sm text-slate-400 mt-0.5 leading-snug">{sub}</p>}
          {cap && <p className="text-sm text-indigo-500 font-medium mt-0.5">{cap}</p>}
        </div>
        <div className="w-36 flex-shrink-0">
          {type === 'count' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChange(Math.max(0, value - 1))}
                className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl font-bold text-slate-600 active:bg-slate-200"
              >
                −
              </button>
              <span className="w-8 text-center text-xl font-bold text-slate-800">{value}</span>
              <button
                onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
                className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl font-bold text-indigo-600 active:bg-indigo-200"
              >
                +
              </button>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">฿</span>
              <input
                type="number"
                inputMode="numeric"
                value={value || ''}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full border-2 border-slate-200 rounded-xl pl-7 pr-2 py-2.5 text-right text-base font-semibold focus:outline-none focus:border-indigo-400 bg-slate-50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'font-bold' : ''}`}>
      <span className={highlight ? 'text-slate-800 font-bold text-base' : 'text-slate-500 text-sm'}>{label}</span>
      <span className={highlight ? 'text-slate-800 text-base' : 'text-slate-600 text-sm'}>{value}</span>
    </div>
  );
}

const TAX_BRACKETS = [
  { range: '1 – 150,000', rate: '0%', color: 'bg-emerald-100 text-emerald-700' },
  { range: '150,001 – 300,000', rate: '5%', color: 'bg-yellow-100 text-yellow-700' },
  { range: '300,001 – 500,000', rate: '10%', color: 'bg-orange-100 text-orange-700' },
  { range: '500,001 – 750,000', rate: '15%', color: 'bg-orange-100 text-orange-700' },
  { range: '750,001 – 1,000,000', rate: '20%', color: 'bg-rose-100 text-rose-600' },
  { range: '1,000,001 – 2,000,000', rate: '25%', color: 'bg-rose-100 text-rose-600' },
  { range: '2,000,001 – 5,000,000', rate: '30%', color: 'bg-rose-200 text-rose-700' },
  { range: '5,000,001 ขึ้นไป', rate: '35%', color: 'bg-rose-200 text-rose-700' },
];

export default function TaxPage() {
  const [input, setInput] = useState<TaxInputData>(DEFAULT_INPUT);
  const [showBrackets, setShowBrackets] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sells, setSells] = useState<SellTransaction[]>([]);
  const [cgtInput, setCgtInput] = useState('');
  const [cgtRate, setCgtRate] = useState('35');
  interface CgtResult { gains: number; additional: number; total: number; marginalRate: number }
  const [cgtResult, setCgtResult] = useState<CgtResult | null>(null);

  useEffect(() => {
    const saved = getTaxData();
    if (saved) setInput(saved);
    setSells(getSellTransactions());
    setMounted(true);
  }, []);

  function setMonthly(v: number) {
    const updated = { ...input, monthlyIncome: v };
    setInput(updated);
    saveTaxData(updated);
  }

  function setOther(v: number) {
    const updated = { ...input, otherIncome: v };
    setInput(updated);
    saveTaxData(updated);
  }

  function setDeduction<K extends keyof TaxDeductions>(key: K, value: TaxDeductions[K]) {
    const updated = { ...input, deductions: { ...input.deductions, [key]: value } };
    setInput(updated);
    saveTaxData(updated);
  }

  function handleCalculateCGT() {
    const rate = Number(cgtRate) || 35;
    const autoTHB = usRealizedGainsUSD * rate;
    const gainsTHB = cgtInput !== '' ? Number(cgtInput) : autoTHB;
    if (gainsTHB <= 0) return;
    const additional = Math.max(0, computeTax(result.netIncome + gainsTHB) - result.taxAmount);
    setCgtResult({
      gains: gainsTHB,
      additional,
      total: result.taxAmount + additional,
      marginalRate: (additional / gainsTHB) * 100,
    });
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const result = calculateTax(input);
  const annualIncome = input.monthlyIncome * 12 + input.otherIncome;

  // CGT calculations
  const usSells = sells.filter((tx) => tx.category === 'us');
  const thaiSells = sells.filter((tx) => tx.category === 'thai');
  const fundSells = sells.filter((tx) => tx.category === 'fund');
  const usRealizedGainsUSD = usSells.reduce((s, tx) => s + (tx.netProfit ?? tx.profit), 0);
  const thaiRealizedGains = thaiSells.reduce((s, tx) => s + (tx.netProfit ?? tx.profit), 0);
  const fundRealizedGains = fundSells.reduce((s, tx) => s + (tx.netProfit ?? tx.profit), 0);

  const cgtRateNum = Number(cgtRate) || 35;
  const usGainsAutoTHB = usRealizedGainsUSD * cgtRateNum;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F9FF 100%)' }}>

      {/* Header */}
      <div
        className="px-5 pt-page-header pb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 60%, #34D399 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />

        <div className="relative">
          <h1 className="text-3xl font-black text-white">คำนวณภาษี</h1>
          <p className="text-emerald-100 text-sm mt-1">ภาษีเงินได้บุคคลธรรมดา พ.ศ. 2567</p>

          {annualIncome > 0 && (
            <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 border border-white/20 backdrop-blur-sm">
              <p className="text-emerald-100 text-xs font-medium mb-0.5">รายได้รวมต่อปี</p>
              <p className="text-white font-black text-2xl">{formatTHB(annualIncome)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-8">

        {/* Income Section */}
        <div className="card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
                 style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
              <span>💼</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">รายได้</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">เงินเดือน (บาท/เดือน)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">฿</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={input.monthlyIncome || ''}
                  onChange={(e) => setMonthly(Number(e.target.value) || 0)}
                  placeholder="เช่น 50000"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label className="label">รายได้อื่นต่อปี (เงินปันผล, ฯลฯ)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">฿</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={input.otherIncome || ''}
                  onChange={(e) => setOther(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="input-field pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tax Result — shown above deductions for quick feedback */}
        {annualIncome > 0 && (
          <div className="card">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
                   style={{ background: result.taxAmount === 0 ? 'linear-gradient(135deg, #059669, #10B981)' : 'linear-gradient(135deg, #E11D48, #F43F5E)' }}>
                <span>🧮</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800">ผลการคำนวณ</h2>
            </div>

            {/* Big tax number */}
            <div className={`rounded-2xl p-5 mb-4 text-center border-2 ${
              result.taxAmount === 0
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-rose-50 border-rose-100'
            }`}>
              <p className="text-slate-500 text-sm font-medium mb-1">ภาษีที่ต้องเสียต่อปี</p>
              <p className={`text-4xl font-black ${result.taxAmount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatTHB(result.taxAmount)}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                อัตราภาษีที่แท้จริง {result.effectiveRate.toFixed(2)}%
              </p>
              {result.taxAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-rose-100">
                  <p className="text-sm text-rose-500 font-semibold">
                    เฉลี่ย {formatTHB(result.taxAmount / 12)} / เดือน
                  </p>
                </div>
              )}
            </div>

            {/* Deduction breakdown */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-3">
              <p className="font-bold text-slate-600 text-sm uppercase tracking-wide mb-3">รายละเอียดลดหย่อน</p>
              <div className="divide-y divide-slate-100">
                <ResultRow label="รายได้รวม" value={formatTHB(result.grossAnnualIncome)} highlight />
                <ResultRow label="หักค่าใช้จ่าย (50%)" value={`−${formatTHB(result.employmentDeduction)}`} />
                <ResultRow label="ลดหย่อนส่วนตัว" value={`−${formatTHB(result.personalDeduction)}`} />
                {result.spouseDeduction > 0 && (
                  <ResultRow label="คู่สมรส" value={`−${formatTHB(result.spouseDeduction)}`} />
                )}
                {result.childDeduction > 0 && (
                  <ResultRow label={`บุตร (${input.deductions.childrenCount} คน)`} value={`−${formatTHB(result.childDeduction)}`} />
                )}
                {result.parentDeduction > 0 && (
                  <ResultRow label={`บิดามารดา (${input.deductions.parentsCount} คน)`} value={`−${formatTHB(result.parentDeduction)}`} />
                )}
                {result.socialSecurityDeduction > 0 && (
                  <ResultRow label="ประกันสังคม" value={`−${formatTHB(result.socialSecurityDeduction)}`} />
                )}
                {result.lifeInsuranceDeduction > 0 && (
                  <ResultRow label="ประกันชีวิต" value={`−${formatTHB(result.lifeInsuranceDeduction)}`} />
                )}
                {result.healthInsuranceDeduction > 0 && (
                  <ResultRow label="ประกันสุขภาพ" value={`−${formatTHB(result.healthInsuranceDeduction)}`} />
                )}
                {(result.pvdDeduction + result.ssfDeduction + result.rmfDeduction) > 0 && (
                  <ResultRow label="กองทุน PVD/SSF/RMF" value={`−${formatTHB(result.pvdDeduction + result.ssfDeduction + result.rmfDeduction)}`} />
                )}
                {result.mortgageDeduction > 0 && (
                  <ResultRow label="ดอกเบี้ยบ้าน" value={`−${formatTHB(result.mortgageDeduction)}`} />
                )}
                {result.donationDeduction > 0 && (
                  <ResultRow label="เงินบริจาค" value={`−${formatTHB(result.donationDeduction)}`} />
                )}
                <div className="pt-2 mt-1">
                  <ResultRow label="ลดหย่อนรวม" value={`−${formatTHB(result.totalDeductions)}`} highlight />
                  <ResultRow label="เงินได้สุทธิ" value={formatTHB(result.netIncome)} highlight />
                </div>
              </div>
            </div>

            {result.taxAmount > 0 && (
              <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
                <p className="font-bold text-indigo-700 text-sm mb-0.5">ลองเพิ่มรายการลดหย่อนด้านล่าง</p>
                <p className="text-xs text-indigo-500">ประกันชีวิต ประกันสุขภาพ กองทุน SSF/RMF ช่วยลดภาษีได้มาก</p>
              </div>
            )}
          </div>
        )}

        {/* Deductions Section */}
        <div className="card">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
                 style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
              <span>📋</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">รายการลดหย่อน</h2>
          </div>

          {/* Auto deductions summary */}
          <div className="bg-emerald-50 rounded-2xl px-4 py-3 mb-4 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">ลดหย่อนอัตโนมัติ</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">หักค่าใช้จ่าย (50%, สูงสุด 100,000 บาท)</span>
              <span className="font-bold text-emerald-700">{formatTHB(result.employmentDeduction)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">ลดหย่อนส่วนตัว</span>
              <span className="font-bold text-emerald-700">{formatTHB(result.personalDeduction)}</span>
            </div>
          </div>

          <div className="space-y-0">
            <DeductionRow
              label="ประกันสังคม"
              sub="จ่ายจริงสูงสุด 9,000 บาท/ปี"
              cap="สูงสุด ฿9,000"
              value={input.deductions.socialSecurity}
              onChange={(v) => setDeduction('socialSecurity', v)}
            />
            <DeductionRow
              label="ประกันชีวิต"
              sub="เบี้ยประกันชีวิตที่จ่ายจริง"
              cap="สูงสุด ฿100,000"
              value={input.deductions.lifeInsurance}
              onChange={(v) => setDeduction('lifeInsurance', v)}
            />
            <DeductionRow
              label="ประกันสุขภาพ"
              sub="เบี้ยประกันสุขภาพที่จ่ายจริง"
              cap="สูงสุด ฿25,000"
              value={input.deductions.healthInsurance}
              onChange={(v) => setDeduction('healthInsurance', v)}
            />
            <DeductionRow
              label="กองทุนสำรองเลี้ยงชีพ (PVD)"
              sub="ที่นายจ้างหักจ่าย"
              cap="สูงสุด ฿500,000"
              value={input.deductions.pvdContribution}
              onChange={(v) => setDeduction('pvdContribution', v)}
            />
            <DeductionRow
              label="กองทุน SSF"
              sub="Super Savings Fund"
              cap="สูงสุด 30% ของรายได้ และไม่เกิน ฿200,000"
              value={input.deductions.ssfAmount}
              onChange={(v) => setDeduction('ssfAmount', v)}
            />
            <DeductionRow
              label="กองทุน RMF"
              sub="Retirement Mutual Fund"
              cap="สูงสุด 30% ของรายได้ และไม่เกิน ฿500,000"
              value={input.deductions.rmfAmount}
              onChange={(v) => setDeduction('rmfAmount', v)}
            />
            <DeductionRow
              label="ดอกเบี้ยบ้าน"
              sub="ดอกเบี้ยเงินกู้ยืมที่อยู่อาศัย"
              cap="สูงสุด ฿100,000"
              value={input.deductions.mortgageInterest}
              onChange={(v) => setDeduction('mortgageInterest', v)}
            />
            <DeductionRow
              label="เงินบริจาค"
              sub="บริจาคทั่วไป (ลดหย่อน 2 เท่า ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน)"
              value={input.deductions.donations}
              onChange={(v) => setDeduction('donations', v)}
            />
            <DeductionRow
              label="คู่สมรส (ไม่มีรายได้)"
              sub="ลดหย่อน ฿60,000"
              value={input.deductions.hasSpouse ? 1 : 0}
              onChange={(v) => setDeduction('hasSpouse', v > 0)}
              type="count"
              max={1}
            />
            <DeductionRow
              label="บุตร"
              sub="คนละ ฿30,000 (ไม่จำกัดจำนวน)"
              value={input.deductions.childrenCount}
              onChange={(v) => setDeduction('childrenCount', v)}
              type="count"
            />
            <DeductionRow
              label="บิดามารดา"
              sub="คนละ ฿30,000 (สูงสุด 4 คน)"
              value={input.deductions.parentsCount}
              onChange={(v) => setDeduction('parentsCount', v)}
              type="count"
              max={4}
            />
          </div>
        </div>

        {/* Capital Gains Tax Section */}
        <div className="card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
                 style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
              <span>📈</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">ภาษีจากกำไรหุ้น (CGT)</h2>
              <p className="text-xs text-slate-400 mt-0.5">จากประวัติการขายในแอป</p>
            </div>
          </div>

          {/* Thai SET — exempt */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇹🇭</span>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">หุ้นไทย (SET)</p>
                  <p className="text-xs text-emerald-600">ยกเว้นภาษี ม.42(7)</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${thaiRealizedGains >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {thaiSells.length > 0 ? `${thaiRealizedGains >= 0 ? '+' : ''}${formatTHB(thaiRealizedGains)}` : '—'}
                </p>
                <p className="text-xs text-emerald-500 font-semibold">ไม่ต้องเสียภาษี</p>
              </div>
            </div>
          </div>

          {/* Thai Funds — exempt */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏦</span>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">กองทุนรวม</p>
                  <p className="text-xs text-emerald-600">กำไรจากขายคืนหน่วยลงทุน ยกเว้นภาษี</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${fundRealizedGains >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {fundSells.length > 0 ? `${fundRealizedGains >= 0 ? '+' : ''}${formatTHB(fundRealizedGains)}` : '—'}
                </p>
                <p className="text-xs text-emerald-500 font-semibold">ไม่ต้องเสียภาษี</p>
              </div>
            </div>
          </div>

          {/* US Stocks — taxable */}
          <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇺🇸</span>
                <div>
                  <p className="font-semibold text-rose-800 text-sm">หุ้น US</p>
                  <p className="text-xs text-rose-500">ต้องเสียภาษีหากนำเงินกลับไทย</p>
                </div>
              </div>
              {usSells.length > 0 && (
                <div className="text-right">
                  <p className={`font-bold text-sm ${usRealizedGainsUSD >= 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                    {usRealizedGainsUSD >= 0 ? '+' : ''}${usRealizedGainsUSD.toFixed(2)}
                  </p>
                  <p className="text-xs text-rose-400">≈ {formatTHB(usGainsAutoTHB)}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Exchange rate + gains input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-rose-700 mb-1.5">อัตราแลกเปลี่ยน (฿/$)</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={cgtRate}
                    onChange={(e) => { setCgtRate(e.target.value); setCgtResult(null); }}
                    placeholder="35"
                    className="w-full border-2 border-rose-200 rounded-xl px-3 py-2.5 text-base font-semibold focus:outline-none focus:border-rose-400 bg-white"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-700 mb-1.5">
                    กำไร US ที่นำกลับไทย (฿)
                  </p>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={cgtInput}
                    onChange={(e) => { setCgtInput(e.target.value); setCgtResult(null); }}
                    placeholder={usGainsAutoTHB > 0 ? String(Math.round(usGainsAutoTHB)) : 'เช่น 50000'}
                    className="w-full border-2 border-rose-200 rounded-xl px-3 py-2.5 text-base font-semibold focus:outline-none focus:border-rose-400 bg-white"
                  />
                </div>
              </div>

              {usGainsAutoTHB > 0 && cgtInput === '' && (
                <p className="text-xs text-rose-400">
                  จากประวัติขาย: {formatTHB(usGainsAutoTHB)} — ปล่อยว่างเพื่อใช้ค่านี้ หรือพิมพ์ทับเพื่อแก้ไข
                </p>
              )}

              {/* Calculate button */}
              <button
                onClick={handleCalculateCGT}
                disabled={cgtInput === '' && usGainsAutoTHB <= 0}
                className={`w-full py-3 rounded-2xl font-bold text-base transition-all ${
                  cgtInput === '' && usGainsAutoTHB <= 0
                    ? 'bg-rose-100 text-rose-300'
                    : 'text-white active:opacity-80'
                }`}
                style={cgtInput !== '' || usGainsAutoTHB > 0 ? {
                  background: 'linear-gradient(135deg, #E11D48, #F43F5E)',
                  boxShadow: '0 4px 14px rgba(225,29,72,0.3)',
                } : {}}
              >
                คำนวณภาษี CGT
              </button>
            </div>
          </div>

          {/* CGT Result — shown only after button press */}
          {cgtResult && (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <div className="bg-slate-800 px-4 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">ผลการคำนวณภาษี CGT</p>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">กำไร US ที่ต้องเสียภาษี</span>
                    <span className="text-white font-semibold">{formatTHB(cgtResult.gains)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">ภาษีเงินได้ปกติ</span>
                    <span className="text-white font-semibold">{formatTHB(result.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">ภาษีเพิ่มจากกำไร US</span>
                    <span className="text-rose-400 font-bold text-base">+{formatTHB(cgtResult.additional)}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2.5 flex justify-between items-center">
                    <span className="text-white font-bold">ภาษีรวมทั้งหมด</span>
                    <span className="text-rose-300 font-black text-2xl">{formatTHB(cgtResult.total)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-700 px-4 py-2.5 flex justify-between items-center">
                <span className="text-slate-400 text-xs">Marginal Rate สำหรับกำไร US</span>
                <span className="text-slate-200 font-bold text-sm">{cgtResult.marginalRate.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Tax Brackets Reference */}
        <div className="card mb-4">
          <button
            onClick={() => setShowBrackets(!showBrackets)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
                   style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
                <span>📊</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800">อัตราภาษีเงินได้</h2>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform ${showBrackets ? 'rotate-180' : ''}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showBrackets && (
            <div className="mt-4 space-y-2">
              {TAX_BRACKETS.map((b) => (
                <div key={b.range} className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">{b.range}</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${b.color}`}>{b.rate}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-2 text-center">หน่วย: บาทต่อปี</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
