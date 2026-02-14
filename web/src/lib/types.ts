/**
 * API Types for Sentimeter Frontend
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface RecommendationItem {
  ticker: string;
  companyName: string;
  sector: string | null;
  action: "buy" | "sell";
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  maxHoldDays: number;
  riskPercent: number;
  rewardPercent: number;
  riskRewardRatio: number;
  sentimentScore: number;
  fundamentalScore: number;
  technicalScore: number;
  overallScore: number;
  newsSummary: string;
  fundamentalSummary: string;
  technicalSummary: string;
  analysisSummary: string;
  status: string;
  statusMessage: string;
  recommendationDate: string;
}

export interface ActivePositionItem {
  ticker: string;
  companyName: string;
  recommendationDate: string;
  entryPrice: number;
  currentPrice: number | null;
  stopLoss: number;
  targetPrice: number;
  status: string;
  unrealizedPnlPct: number | null;
  daysHeld: number;
  suggestedAction: string;
}

export interface PredictionSummary {
  totalActive: number;
  totalPending: number;
  totalClosed: number;
  winRate: number | null;
  avgReturn: number | null;
}

export interface RecommendationsResponse {
  date: string;
  schedule: "morning" | "evening";
  generatedAt: string;
  recommendations: RecommendationItem[];
  activePositions: ActivePositionItem[];
  summary: PredictionSummary;
}

export interface HistoryItem {
  ticker: string;
  companyName: string;
  recommendationDate: string;
  action: string;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  status: string;
  exitDate: string | null;
  exitPrice: number | null;
  profitLossPct: number | null;
  overallScore: number;
}

export interface HistoryStats {
  totalRecommendations: number;
  winRate: number | null;
  avgReturn: number | null;
  bestPick: { ticker: string; returnPct: number } | null;
  worstPick: { ticker: string; returnPct: number } | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface HistoryResponse {
  items: HistoryItem[];
  pagination: Pagination;
  stats: HistoryStats;
}

export interface HistoryParams {
  page?: number;
  pageSize?: number;
  ticker?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface RefreshResponse {
  triggered: boolean;
  schedule: string;
  jobId: number | null;
  message: string;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "step";
  message: string;
  step?: number;
  totalSteps?: number;
}

export interface SchedulerState {
  enabled: boolean;
  morningTime: string;
  eveningTime: string;
  nextRun: string | null;
  message?: string;
}

// ============================================================================
// Avoid / Unrecommended (display-only, not saved)
// ============================================================================

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

export interface AvoidResponse {
  items: AvoidItem[];
  count: number;
}

// ============================================================================
// Market Outlook
// ============================================================================

export interface NewsHighlight {
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
}

export interface MarketOutlookData {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  bullishSignals: string[];
  bearishSignals: string[];
  globalNews: NewsHighlight[];
  localNews: NewsHighlight[];
  generatedAt: string;
}

// ============================================================================
// Ticker Analysis
// ============================================================================

export interface TickerAnalysisResponse {
  ticker: string;
  companyName: string;
  sector: string | null;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  fundamentals: {
    peRatio: number | null;
    pbRatio: number | null;
    roe: number | null;
    debtToEquity: number | null;
    dividendYield: number | null;
    marketCap: number | null;
  };
  technical: {
    trend: string;
    sma20: number | null;
    sma50: number | null;
    high3Month: number;
    low3Month: number;
    supports: number[];
    resistances: number[];
    volatilityPercent: number;
  };
  relevantNews: Array<{ title: string; portal: string; publishedAt: string | null }>;
  analysis: {
    action: string;
    confidence: number;
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    maxHoldDays: number;
    overallScore: number;
    sentimentScore: number;
    fundamentalScore: number;
    technicalScore: number;
    analysisSummary: string;
    newsSummary: string;
    fundamentalSummary: string;
    technicalSummary: string;
  } | null;
}

export interface AppConfig {
  scheduler: {
    morningHour: number;
    morningMinute: number;
    eveningHour: number;
    eveningMinute: number;
    morningTime: string;
    eveningTime: string;
    nextRun: string | null;
  };
  telegram: {
    configured: boolean;
    botToken: string;
    chatId: string;
  };
  anomaly: {
    priceChangePct: number;
    volumeMultiplier: number;
  };
  llm: {
    baseUrl: string;
    model: string;
    apiKey: string;
    configured: boolean;
  };
}

export type ConfigPatch = Partial<{
  scheduler: {
    morningHour: number;
    morningMinute: number;
    eveningHour: number;
    eveningMinute: number;
  };
  telegram: { botToken: string; chatId: string };
  anomaly: { priceChangePct: number; volumeMultiplier: number };
  llm: { baseUrl: string; model: string; apiKey: string };
}>;
