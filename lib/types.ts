export interface Stock {
  id: string;
  name: string;
  ticker: string;
  category: 'us' | 'thai' | 'fund';
  purchaseDate: string;
  purchasePrice: number;
  shares: number;
  currentPrice: number;
  note?: string;
  buyCommission?: number;
}

export interface SellTransaction {
  id: string;
  ticker: string;
  name: string;
  category: 'us' | 'thai' | 'fund';
  purchaseDate: string;
  purchasePrice: number;
  sellDate: string;
  sellPrice: number;
  sharesSold: number;
  proceeds: number;
  costBasis: number;
  profit: number;
  sellCommission?: number;
  netProfit: number;
}

export interface TaxDeductions {
  lifeInsurance: number;
  healthInsurance: number;
  pvdContribution: number;
  ssfAmount: number;
  rmfAmount: number;
  mortgageInterest: number;
  parentsCount: number;
  childrenCount: number;
  hasSpouse: boolean;
  donations: number;
  socialSecurity: number;
}

export interface TaxInputData {
  monthlyIncome: number;
  otherIncome: number;
  deductions: TaxDeductions;
}

export interface TaxResult {
  grossAnnualIncome: number;
  employmentDeduction: number;
  personalDeduction: number;
  spouseDeduction: number;
  childDeduction: number;
  parentDeduction: number;
  lifeInsuranceDeduction: number;
  healthInsuranceDeduction: number;
  pvdDeduction: number;
  ssfDeduction: number;
  rmfDeduction: number;
  mortgageDeduction: number;
  donationDeduction: number;
  socialSecurityDeduction: number;
  totalDeductions: number;
  netIncome: number;
  taxAmount: number;
  effectiveRate: number;
}
