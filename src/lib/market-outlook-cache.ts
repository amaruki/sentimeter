/**
 * Market Outlook Cache
 *
 * In-memory cache for market outlook/global sentiment data.
 * Generated during analysis runs, displayed on dashboard.
 */

export interface MarketOutlookData {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  bullishSignals: string[];
  bearishSignals: string[];
  globalNews: NewsHighlight[];
  localNews: NewsHighlight[];
  generatedAt: string;
}

export interface NewsHighlight {
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let outlook: MarketOutlookData | null = null;
let lastUpdated: number = 0;

export function setMarketOutlook(data: MarketOutlookData): void {
  outlook = data;
  lastUpdated = Date.now();
}

export function getMarketOutlook(): MarketOutlookData | null {
  if (Date.now() - lastUpdated > CACHE_TTL_MS) {
    outlook = null;
    return null;
  }
  return outlook;
}

export function clearMarketOutlook(): void {
  outlook = null;
  lastUpdated = 0;
}
