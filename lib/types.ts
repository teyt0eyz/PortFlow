export interface StockLot {
  id: string;
  purchaseDate: string;
  purchasePrice: number;
  shares: number;
  buyCommission?: number;
}

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  category: 'us' | 'thai' | 'fund';
  purchaseDate: string;   // earliest lot date
  purchasePrice: number;  // weighted average price per share
  shares: number;         // total shares across all lots
  currentPrice: number;
  note?: string;
  buyCommission?: number; // total commission across all lots
  lots?: StockLot[];      // individual purchase lots
}

export interface Dividend {
  id: string;
  stockId: string;
  ticker: string;
  name: string;
  category: 'us' | 'thai' | 'fund';
  date: string;
  amountPerShare: number;
  shares: number;
  grossAmount: number;
  withholdingTaxRate: number;
  withholdingTax: number;
  netAmount: number;
  note?: string;
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
