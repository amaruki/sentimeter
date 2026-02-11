/**
 * Avoid Cache
 *
 * In-memory cache for AVOID/unrecommended tickers.
 * These are high-risk/high-return stocks that we display
 * temporarily but do NOT save as positions.
 */

export interface AvoidItem {
  ticker: string;
  companyName: string;
  sector: string | null;
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  overallScore: number;
  sentimentScore: number;
  fundamentalScore: number;
  technicalScore: number;
  analysisSummary: string;
  riskPercent: number;
  rewardPercent: number;
  reason: string;
  detectedAt: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let avoidItems: AvoidItem[] = [];
let lastUpdated: number = 0;

export function setAvoidItems(items: AvoidItem[]): void {
  avoidItems = items;
  lastUpdated = Date.now();
}

export function addAvoidItem(item: AvoidItem): void {
  // Prevent duplicates by ticker
  avoidItems = avoidItems.filter((i) => i.ticker !== item.ticker);
  avoidItems.push(item);
  lastUpdated = Date.now();
}

export function getAvoidItems(): AvoidItem[] {
  // Return empty if cache is stale
  if (Date.now() - lastUpdated > CACHE_TTL_MS) {
    avoidItems = [];
    return [];
  }
  return [...avoidItems];
}

export function clearAvoidItems(): void {
  avoidItems = [];
  lastUpdated = 0;
}
