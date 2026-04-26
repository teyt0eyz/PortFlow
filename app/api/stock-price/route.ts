import { NextRequest, NextResponse } from 'next/server';

// Using a mobile SDK User-Agent avoids Yahoo Finance's aggressive rate limiting
// on browser-like UAs when called from server-side
const UA = 'Dart/3.0 (dart:io)';

// In-memory cache — reduces Yahoo Finance calls when serverless instance is warm
const cache = new Map<string, { price: number; shortName: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string) {
  const e = cache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL ? e : null;
}

// --- Stooq (no auth, no rate limit, reliable for US stocks) ---
async function fromStooq(ticker: string, category: 'us' | 'thai' | 'fund'): Promise<number | null> {
  const sym = category === 'thai' ? `${ticker}.th` : `${ticker}.us`;
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const cols = lines[1].split(','); // Symbol,Date,Time,Open,High,Low,Close,Volume
    const close = parseFloat(cols[6]);
    return isNaN(close) || close <= 0 ? null : close;
  } catch {
    return null;
  }
}

// --- Yahoo Finance v8 chart (Thai .BK stocks — try both query hosts) ---
async function fromYahoo(
  ticker: string,
  category: 'us' | 'thai' | 'fund'
): Promise<{ price: number; shortName: string } | 'rate_limited' | null> {
  const symbol = category === 'thai' ? `${ticker}.BK` : ticker;

  for (const host of ['query2', 'query1']) {
    try {
      const res = await fetch(
        `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': UA,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          next: { revalidate: 0 },
        }
      );

      if (res.status === 429) {
        // rate limited on this host — try next host
        continue;
      }
      if (!res.ok) continue;

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        return {
          price: meta.regularMarketPrice,
          shortName: meta.shortName || meta.longName || ticker.toUpperCase(),
        };
      }
    } catch { /* try next host */ }
  }

  // Both hosts returned 429 or failed
  return 'rate_limited';
}

// --- Route handler ---
export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase();
  const category = (request.nextUrl.searchParams.get('category') ?? 'us') as 'us' | 'thai' | 'fund';

  if (!ticker) {
    return NextResponse.json({ error: 'กรุณาระบุชื่อหุ้น' }, { status: 400 });
  }

  // Return cached result if available
  const cacheKey = `${ticker}:${category}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({
      symbol: ticker,
      price: cached.price,
      shortName: cached.shortName,
      currency: category === 'thai' ? 'THB' : 'USD',
      cached: true,
    });
  }

  let price: number | null = null;
  let shortName = ticker;

  if (category === 'us') {
    // US: Stooq (fast, no rate limit) → Yahoo Finance fallback
    price = await fromStooq(ticker, 'us');
    if (price === null) {
      const yf = await fromYahoo(ticker, 'us');
      if (yf === 'rate_limited') {
        return NextResponse.json(
          { error: 'เซิร์ฟเวอร์ถูก rate limit ชั่วคราว กรุณารอ 1 นาทีแล้วลองใหม่' },
          { status: 429 }
        );
      }
      if (yf) { price = yf.price; shortName = yf.shortName; }
    }
  } else if (category === 'thai') {
    // Thai: Yahoo Finance .BK → Stooq fallback
    const yf = await fromYahoo(ticker, 'thai');
    if (yf !== 'rate_limited' && yf !== null) {
      price = yf.price;
      shortName = yf.shortName;
    } else if (yf === 'rate_limited') {
      price = await fromStooq(ticker, 'thai');
      if (price === null) {
        return NextResponse.json(
          { error: 'เซิร์ฟเวอร์ถูก rate limit ชั่วคราว กรุณารอ 1 นาทีแล้วลองใหม่' },
          { status: 429 }
        );
      }
    }
  } else {
    // Fund: try Yahoo Finance without suffix (works for ETFs like TDEX, TH50ETF)
    const yf = await fromYahoo(ticker, 'us');
    if (yf !== 'rate_limited' && yf !== null) {
      price = yf.price;
      shortName = yf.shortName;
    }
    // Regular mutual funds (NAV-based) are not on public price feeds —
    // if not found, user enters NAV manually below
  }

  if (price === null) {
    const msg = category === 'fund'
      ? `ไม่พบ NAV ของ "${ticker}" — กองทุนรวมส่วนใหญ่ NAV อัปเดตรายวัน กรุณากรอก NAV ด้วยตัวเอง`
      : `ไม่พบหุ้น "${ticker}" — ตรวจสอบชื่อย่อให้ถูกต้อง`;
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  // Store in cache
  cache.set(cacheKey, { price, shortName, ts: Date.now() });

  return NextResponse.json({
    symbol: ticker,
    price,
    shortName,
    currency: category === 'us' ? 'USD' : 'THB',
  });
}
