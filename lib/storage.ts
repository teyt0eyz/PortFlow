'use client';

import { Stock, StockLot, TaxInputData, SellTransaction, Dividend } from './types';

const STOCKS_KEY = 'portflow_stocks';
const TAX_KEY = 'portflow_tax';
const SELLS_KEY = 'portflow_sells';

export function getStocks(): Stock[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STOCKS_KEY);
    const stocks: Stock[] = data ? JSON.parse(data) : [];
    // Migrate: ensure every stock has a lots array
    let needsSave = false;
    for (const stock of stocks) {
      if (!stock.lots) {
        stock.lots = [{
          id: generateId(),
          purchaseDate: stock.purchaseDate,
          purchasePrice: stock.purchasePrice,
          shares: stock.shares,
          buyCommission: stock.buyCommission,
        }];
        needsSave = true;
      }
    }
    if (needsSave) localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
    return stocks;
  } catch {
    return [];
  }
}

export function saveStocks(stocks: Stock[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
}

export function addStock(stockData: Omit<Stock, 'id'>): void {
  const stocks = getStocks();
  const existing = stocks.find(
    (s) => s.ticker === stockData.ticker && s.category === stockData.category
  );

  if (existing) {
    // DCA: merge new lot into existing position
    const existingLots: StockLot[] = existing.lots ?? [{
      id: generateId(),
      purchaseDate: existing.purchaseDate,
      purchasePrice: existing.purchasePrice,
      shares: existing.shares,
      buyCommission: existing.buyCommission,
    }];
    const newLot: StockLot = {
      id: generateId(),
      purchaseDate: stockData.purchaseDate,
      purchasePrice: stockData.purchasePrice,
      shares: stockData.shares,
      buyCommission: stockData.buyCommission,
    };
    const allLots = [...existingLots, newLot];
    const totalShares = allLots.reduce((sum, l) => sum + l.shares, 0);
    const weightedAvg = allLots.reduce((sum, l) => sum + l.purchasePrice * l.shares, 0) / totalShares;
    const totalCommission = allLots.reduce((sum, l) => sum + (l.buyCommission ?? 0), 0);
    existing.lots = allLots;
    existing.shares = totalShares;
    existing.purchasePrice = weightedAvg;
    existing.buyCommission = totalCommission > 0 ? totalCommission : undefined;
    existing.currentPrice = stockData.currentPrice;
    existing.purchaseDate = allLots[0].purchaseDate;
    saveStocks(stocks);
  } else {
    const id = generateId();
    const lot: StockLot = {
      id: generateId(),
      purchaseDate: stockData.purchaseDate,
      purchasePrice: stockData.purchasePrice,
      shares: stockData.shares,
      buyCommission: stockData.buyCommission,
    };
    stocks.push({ ...stockData, id, lots: [lot] });
    saveStocks(stocks);
  }
}

export function removeLot(stockId: string, lotId: string): void {
  const stocks = getStocks();
  const stock = stocks.find((s) => s.id === stockId);
  if (!stock || !stock.lots) return;
  const newLots = stock.lots.filter((l) => l.id !== lotId);
  if (newLots.length === 0) {
    saveStocks(stocks.filter((s) => s.id !== stockId));
    return;
  }
  const totalShares = newLots.reduce((sum, l) => sum + l.shares, 0);
  const weightedAvg = newLots.reduce((sum, l) => sum + l.purchasePrice * l.shares, 0) / totalShares;
  const totalCommission = newLots.reduce((sum, l) => sum + (l.buyCommission ?? 0), 0);
  stock.lots = newLots;
  stock.shares = totalShares;
  stock.purchasePrice = weightedAvg;
  stock.buyCommission = totalCommission > 0 ? totalCommission : undefined;
  stock.purchaseDate = newLots[0].purchaseDate;
  saveStocks(stocks);
}

export function updateStock(updated: Stock): void {
  const stocks = getStocks();
  const idx = stocks.findIndex((s) => s.id === updated.id);
  if (idx !== -1) {
    stocks[idx] = updated;
    saveStocks(stocks);
  }
}

export function deleteStock(id: string): void {
  const stocks = getStocks().filter((s) => s.id !== id);
  saveStocks(stocks);
}

export function getTaxData(): TaxInputData | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(TAX_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveTaxData(data: TaxInputData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TAX_KEY, JSON.stringify(data));
}

export function getSellTransactions(): SellTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SELLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addSellTransaction(tx: SellTransaction): void {
  if (typeof window === 'undefined') return;
  const txs = getSellTransactions();
  txs.push(tx);
  localStorage.setItem(SELLS_KEY, JSON.stringify(txs));
}

export function deleteSellTransaction(id: string): void {
  if (typeof window === 'undefined') return;
  const txs = getSellTransactions().filter((t) => t.id !== id);
  localStorage.setItem(SELLS_KEY, JSON.stringify(txs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const DIVIDENDS_KEY = 'portflow_dividends';

export function getDividends(): Dividend[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(DIVIDENDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addDividend(d: Dividend): void {
  if (typeof window === 'undefined') return;
  const all = getDividends();
  all.push(d);
  localStorage.setItem(DIVIDENDS_KEY, JSON.stringify(all));
}

export function deleteDividend(id: string): void {
  if (typeof window === 'undefined') return;
  const all = getDividends().filter((d) => d.id !== id);
  localStorage.setItem(DIVIDENDS_KEY, JSON.stringify(all));
}

const TARGET_KEY = 'portflow_target';

export interface TargetAllocation {
  us: number;
  thai: number;
  fund: number;
}

export function getTargetAllocation(): TargetAllocation {
  if (typeof window === 'undefined') return { us: 34, thai: 33, fund: 33 };
  try {
    const data = localStorage.getItem(TARGET_KEY);
    return data ? JSON.parse(data) : { us: 34, thai: 33, fund: 33 };
  } catch {
    return { us: 34, thai: 33, fund: 33 };
  }
}

export function saveTargetAllocation(t: TargetAllocation): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TARGET_KEY, JSON.stringify(t));
}
