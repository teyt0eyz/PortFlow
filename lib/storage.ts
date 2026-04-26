'use client';

import { Stock, TaxInputData } from './types';

const STOCKS_KEY = 'portflow_stocks';
const TAX_KEY = 'portflow_tax';

export function getStocks(): Stock[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STOCKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStocks(stocks: Stock[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
}

export function addStock(stock: Stock): void {
  const stocks = getStocks();
  stocks.push(stock);
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

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
