import { Stock } from './types';

export interface StockSummary {
  totalCost: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export function calculateStockValue(stock: Stock): {
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  totalCost: number;
} {
  const totalCost = stock.purchasePrice * stock.shares;
  const currentValue = stock.currentPrice * stock.shares;
  const profitLoss = currentValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
  return { totalCost, currentValue, profitLoss, profitLossPercent };
}

export function summarizeStocks(stocks: Stock[]): StockSummary {
  const totalCost = stocks.reduce((sum, s) => sum + s.purchasePrice * s.shares, 0);
  const currentValue = stocks.reduce((sum, s) => sum + s.currentPrice * s.shares, 0);
  const profitLoss = currentValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
  return { totalCost, currentValue, profitLoss, profitLossPercent };
}
