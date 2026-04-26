'use client';

import { useEffect, useState } from 'react';
import { TaxInputData, TaxDeductions } from '@/lib/types';
import { calculateTax, formatTHB } from '@/lib/taxCalculation';
import { getTaxData, saveTaxData } from '@/lib/storage';

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
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-700">{label}</p>
          {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
          {cap && <p className="text-sm text-blue-500 font-medium mt-0.5">{cap}</p>}
        </div>
        <div className="w-36">
          {type === 'count' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChange(Math.max(0, value - 1))}
                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-bold active:bg-gray-200"
              >
                −
              </button>
              <span className="w-8 text-center text-xl font-bold">{value}</span>
              <button
                onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
                className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl font-bold text-blue-600 active:bg-blue-200"
              >
                +
              </button>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">฿</span>
              <input
                type="number"
                inputMode="numeric"
                value={value || ''}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full border-2 border-gray-200 rounded-xl pl-7 pr-2 py-2 text-right text-base font-semibold focus:outline-none focus:border-blue-500 bg-white"
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
      <span className={`${highlight ? 'text-gray-800 font-bold text-base' : 'text-gray-500 text-sm'}`}>{label}</span>
      <span className={`${highlight ? 'text-gray-800 text-base' : 'text-gray-600 text-sm'}`}>{value}</span>
    </div>
  );
}

const TAX_BRACKETS = [
  { range: '1 - 150,000', rate: '0%', color: 'bg-green-100 text-green-700' },
  { range: '150,001 - 300,000', rate: '5%', color: 'bg-yellow-100 text-yellow-700' },
  { range: '300,001 - 500,000', rate: '10%', color: 'bg-orange-100 text-orange-700' },
  { range: '500,001 - 750,000', rate: '15%', color: 'bg-orange-100 text-orange-700' },
  { range: '750,001 - 1,000,000', rate: '20%', color: 'bg-red-100 text-red-600' },
  { range: '1,000,001 - 2,000,000', rate: '25%', color: 'bg-red-100 text-red-600' },
  { range: '2,000,001 - 5,000,000', rate: '30%', color: 'bg-red-200 text-red-700' },
  { range: '5,000,001 ขึ้นไป', rate: '35%', color: 'bg-red-200 text-red-700' },
];

export default function TaxPage() {
  const [input, setInput] = useState<TaxInputData>(DEFAULT_INPUT);
  const [showBrackets, setShowBrackets] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = getTaxData();
    if (saved) setInput(saved);
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

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const result = calculateTax(input);
  const annualIncome = input.monthlyIncome * 12 + input.otherIncome;

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-800">คำนวณภาษี</h1>
        <p className="text-sm text-gray-400">ตามกฎหมายภาษีเงินได้บุคคลธรรมดา พ.ศ. 2567</p>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Income Section */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base">💼</span>
            รายได้
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">เงินเดือน (บาท/เดือน)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">฿</span>
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">฿</span>
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

            {annualIncome > 0 && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-blue-700 font-semibold">รายได้รวมต่อปี</span>
                <span className="text-blue-700 font-black text-xl">{formatTHB(annualIncome)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Deductions Section */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-base">📋</span>
            รายการลดหย่อน
          </h2>

          {/* Auto deductions */}
          <div className="bg-green-50 rounded-xl p-3 mb-4 space-y-1">
            <p className="text-sm font-bold text-green-700 mb-2">ลดหย่อนอัตโนมัติ</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">หักค่าใช้จ่าย (50%, สูงสุด 100,000 บาท)</span>
              <span className="font-bold text-green-700">{formatTHB(result.employmentDeduction)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ลดหย่อนส่วนตัว</span>
              <span className="font-bold text-green-700">{formatTHB(result.personalDeduction)}</span>
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
              value={input.deductions.hasSpouse ? 1 : 0}
              onChange={(v) => setDeduction('hasSpouse', v > 0)}
              type="count"
              max={1}
              sub="ลดหย่อน ฿60,000"
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

        {/* Tax Result */}
        {annualIncome > 0 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-base">🧮</span>
              ผลการคำนวณ
            </h2>

            {/* Main Tax Display */}
            <div className={`rounded-2xl p-5 mb-4 text-center ${
              result.taxAmount === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <p className="text-gray-500 text-base mb-1">ภาษีที่ต้องเสีย</p>
              <p className={`text-4xl font-black ${result.taxAmount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatTHB(result.taxAmount)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                อัตราภาษีที่แท้จริง {result.effectiveRate.toFixed(2)}%
              </p>
            </div>

            {/* Deduction Breakdown */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-bold text-gray-700 mb-3">รายละเอียดลดหย่อน</p>
              <div className="divide-y divide-gray-100">
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

            {/* Monthly breakdown */}
            {result.taxAmount > 0 && (
              <div className="bg-orange-50 rounded-xl p-4 mb-4">
                <p className="font-bold text-orange-700 mb-2">เฉลี่ยต่อเดือน</p>
                <div className="flex justify-between">
                  <span className="text-gray-600">ภาษีต่อเดือน</span>
                  <span className="font-bold text-orange-600">{formatTHB(result.taxAmount / 12)}</span>
                </div>
              </div>
            )}

            {/* Savings tip */}
            {result.taxAmount > 0 && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="font-bold text-blue-700 mb-1">💡 เพิ่มลดหย่อน ประหยัดภาษี</p>
                <p className="text-sm text-blue-600">
                  ลองใส่รายการลดหย่อน เช่น ประกันชีวิต ประกันสุขภาพ กองทุน SSF/RMF เพื่อลดภาษี
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tax Brackets Reference */}
        <div className="card mb-4">
          <button
            onClick={() => setShowBrackets(!showBrackets)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-base">📊</span>
              อัตราภาษีเงินได้บุคคลธรรมดา
            </h2>
            <svg className={`w-6 h-6 text-gray-400 transition-transform ${showBrackets ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showBrackets && (
            <div className="mt-4 space-y-2">
              {TAX_BRACKETS.map((b) => (
                <div key={b.range} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{b.range}</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${b.color}`}>{b.rate}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2 text-center">หน่วย: บาทต่อปี</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
