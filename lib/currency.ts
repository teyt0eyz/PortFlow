'use client';

export type Currency = 'THB' | 'USD';

const CURRENCY_KEY = 'portflow_currency';
const RATE_KEY = 'portflow_usd_thb_rate';
const RATE_TS_KEY = 'portflow_rate_ts';

export function getSavedCurrency(): Currency {
  if (typeof window === 'undefined') return 'THB';
  return (localStorage.getItem(CURRENCY_KEY) as Currency) || 'THB';
}

export function saveCurrency(c: Currency) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENCY_KEY, c);
}

export function getSavedRate(): number {
  if (typeof window === 'undefined') return 35;
  return Number(localStorage.getItem(RATE_KEY)) || 35;
}

export function saveRate(rate: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RATE_KEY, String(rate));
  localStorage.setItem(RATE_TS_KEY, Date.now().toString());
}

export function getRateUpdatedAt(): string {
  if (typeof window === 'undefined') return '';
  const ts = localStorage.getItem(RATE_TS_KEY);
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export async function fetchLatestRate(): Promise<number> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    next: { revalidate: 0 },
  });
  const data = await res.json();
  if (data?.result !== 'success' || !data.rates?.THB) throw new Error('No rate');
  return data.rates.THB;
}

// Convert amount in `from` currency to `to` currency
export function convert(amount: number, from: Currency, to: Currency, rate: number): number {
  if (from === to) return amount;
  return from === 'USD' ? amount * rate : amount / rate;
}

export function fmt(amount: number, currency: Currency, showSign = false): string {
  const sign = showSign && amount > 0 ? '+' : '';
  if (currency === 'USD') {
    return sign + new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  }
  return sign + new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
