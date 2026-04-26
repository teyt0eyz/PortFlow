import { TaxInputData, TaxResult } from './types';

const TAX_BRACKETS = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.10 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.20 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.30 },
  { upTo: Infinity, rate: 0.35 },
];

export function computeTax(netIncome: number): number {
  if (netIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of TAX_BRACKETS) {
    if (netIncome <= prev) break;
    const taxable = Math.min(netIncome, bracket.upTo) - prev;
    tax += taxable * bracket.rate;
    prev = bracket.upTo;
  }
  return Math.round(tax);
}

export function calculateTax(input: TaxInputData): TaxResult {
  const { monthlyIncome, otherIncome, deductions } = input;

  const grossAnnualIncome = monthlyIncome * 12 + otherIncome;

  const employmentDeduction = Math.min(grossAnnualIncome * 0.5, 100_000);
  const personalDeduction = 60_000;
  const spouseDeduction = deductions.hasSpouse ? 60_000 : 0;
  const childDeduction = deductions.childrenCount * 30_000;
  const parentDeduction = Math.min(deductions.parentsCount, 4) * 30_000;

  const lifeInsuranceDeduction = Math.min(deductions.lifeInsurance, 100_000);
  const healthInsuranceDeduction = Math.min(deductions.healthInsurance, 25_000);

  const combinedInvestment = deductions.pvdContribution + deductions.ssfAmount + deductions.rmfAmount;
  const investmentCap = Math.min(grossAnnualIncome * 0.3, 500_000);
  const pvdDeduction = Math.min(deductions.pvdContribution, 500_000);
  const ssfDeduction = Math.min(deductions.ssfAmount, Math.min(grossAnnualIncome * 0.3, 200_000));
  const rmfDeduction = Math.min(deductions.rmfAmount, Math.min(grossAnnualIncome * 0.3, 500_000));
  const totalInvestmentDeduction = Math.min(pvdDeduction + ssfDeduction + rmfDeduction, investmentCap);

  const mortgageDeduction = Math.min(deductions.mortgageInterest, 100_000);
  const socialSecurityDeduction = Math.min(deductions.socialSecurity, 9_000);

  const preDeductionNet =
    grossAnnualIncome -
    employmentDeduction -
    personalDeduction -
    spouseDeduction -
    childDeduction -
    parentDeduction -
    lifeInsuranceDeduction -
    healthInsuranceDeduction -
    totalInvestmentDeduction -
    mortgageDeduction -
    socialSecurityDeduction;

  const donationDeduction = Math.min(deductions.donations * 2, preDeductionNet * 0.1);

  const netIncome = Math.max(0, preDeductionNet - donationDeduction);

  const totalDeductions =
    employmentDeduction +
    personalDeduction +
    spouseDeduction +
    childDeduction +
    parentDeduction +
    lifeInsuranceDeduction +
    healthInsuranceDeduction +
    totalInvestmentDeduction +
    mortgageDeduction +
    socialSecurityDeduction +
    donationDeduction;

  const taxAmount = computeTax(netIncome);
  const effectiveRate = grossAnnualIncome > 0 ? (taxAmount / grossAnnualIncome) * 100 : 0;

  return {
    grossAnnualIncome,
    employmentDeduction,
    personalDeduction,
    spouseDeduction,
    childDeduction,
    parentDeduction,
    lifeInsuranceDeduction,
    healthInsuranceDeduction,
    pvdDeduction: Math.min(pvdDeduction, totalInvestmentDeduction),
    ssfDeduction: Math.min(ssfDeduction, totalInvestmentDeduction - Math.min(pvdDeduction, totalInvestmentDeduction)),
    rmfDeduction: Math.max(0, totalInvestmentDeduction - Math.min(pvdDeduction, totalInvestmentDeduction) - ssfDeduction),
    mortgageDeduction,
    donationDeduction,
    socialSecurityDeduction,
    totalDeductions,
    netIncome,
    taxAmount,
    effectiveRate,
  };
}

export function formatTHB(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('th-TH').format(value);
}
