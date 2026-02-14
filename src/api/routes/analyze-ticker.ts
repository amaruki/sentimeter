/**
 * Analyze Ticker Route
 *
 * POST /api/analyze-ticker - Analyze an individual ticker on demand
 *
 * Useful when the job failed to parse some ticker data.
 * Fetches news, technical, and fundamental data then runs LLM analysis.
 */

import { jsonResponse } from "../middleware/cors.ts";
import { successResponse, errorResponse } from "../types.ts";
import { analyzeStock } from "../../lib/analyzer/stock-analyzer.ts";
import type { StockAnalysisInput } from "../../lib/analyzer/types.ts";
import {
  fetchCurrentQuote,
  fetchPriceHistory,
  calculateTechnicalSummary,
} from "../../lib/market-data/technical.ts";
import { fetchFundamentals } from "../../lib/market-data/fundamental.ts";
import {
  getRecentNewsArticles,
  upsertStockFundamental,
} from "../../lib/database/queries.ts";
import { getTrackedPredictions } from "../../lib/prediction-tracker/updater.ts";

interface AnalyzeTickerRequest {
  ticker: string;
}

interface TickerAnalysisResponse {
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

export async function handleAnalyzeTicker(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");

  try {
    const body = (await request.json()) as AnalyzeTickerRequest;
    const rawTicker = body.ticker?.trim()?.toUpperCase();

    if (!rawTicker) {
      return jsonResponse(errorResponse("Missing 'ticker' in request body"), 400, origin);
    }

    // Append .JK suffix for IDX tickers if not already present
    const ticker = rawTicker.includes(".") ? rawTicker : `${rawTicker}.JK`;

    // Fetch all data in parallel
    const [quoteResult, fundamentalsResult, historyResult] = await Promise.all([
      fetchCurrentQuote(ticker),
      fetchFundamentals(ticker),
      fetchPriceHistory(ticker, "3mo"),
    ]);

    if (!quoteResult.success || !quoteResult.data) {
      return jsonResponse(
        errorResponse(`Failed to fetch quote for ${ticker}: ${quoteResult.error}`),
        404,
        origin
      );
    }

    const quote = quoteResult.data;
    const fundamentals = fundamentalsResult.success ? fundamentalsResult.data : null;

    // Cache fundamentals if available
    if (fundamentals) {
      upsertStockFundamental({
        ticker: fundamentals.ticker,
        companyName: fundamentals.companyName,
        sector: fundamentals.sector,
        marketCap: fundamentals.marketCap,
        peRatio: fundamentals.peRatio,
        pbRatio: fundamentals.pbRatio,
        roe: fundamentals.roe,
        debtToEquity: fundamentals.debtToEquity,
        dividendYield: fundamentals.dividendYield,
      });
    }

    // Calculate technicals
    let technical = null;
    if (historyResult.success && historyResult.data) {
      technical = calculateTechnicalSummary(ticker, historyResult.data, quote.price);
    }

    // Search for relevant news mentioning this ticker
    const recentArticles = getRecentNewsArticles(7);
    const tickerBase = rawTicker.replace(".JK", "");
    const relevantNews = recentArticles
      .filter((a) => {
        const text = `${a.title} ${a.content ?? ""}`.toUpperCase();
        return text.includes(tickerBase);
      })
      .slice(0, 10)
      .map((a) => ({
        title: a.title,
        portal: a.portal,
        publishedAt: a.publishedAt ? String(a.publishedAt) : null,
      }));

    // Run LLM analysis if we have enough data
    let analysisResult = null;
    if (technical) {
      // Get active predictions for context
      const activePredictions = await getTrackedPredictions();
      const activePredictionInputs = activePredictions
        .filter((p) => p.status === "pending" || p.status === "entry_hit")
        .filter((p) => p.ticker === ticker)
        .map((p) => ({
          ticker: p.ticker,
          recommendationDate: p.recommendationDate,
          entryPrice: p.entryPrice,
          stopLoss: p.stopLoss,
          targetPrice: p.targetPrice,
          currentPrice: p.currentPrice ?? p.entryPrice,
          status: p.status as "pending" | "entry_hit",
          daysActive: p.daysActive,
        }));

      const analysisInput: StockAnalysisInput = {
        ticker,
        companyName: fundamentals?.companyName ?? tickerBase,
        sector: fundamentals?.sector ?? null,
        currentPrice: quote.price,
        priceChange: quote.change,
        priceChangePct: quote.changePercent,
        peRatio: fundamentals?.peRatio ?? null,
        pbRatio: fundamentals?.pbRatio ?? null,
        roe: fundamentals?.roe ?? null,
        debtToEquity: fundamentals?.debtToEquity ?? null,
        dividendYield: fundamentals?.dividendYield ?? null,
        marketCap: fundamentals?.marketCap ?? null,
        trend: technical.trend,
        sma20: technical.sma20,
        sma50: technical.sma50,
        high3Month: technical.high3Month,
        low3Month: technical.low3Month,
        supports: technical.supports,
        resistances: technical.resistances,
        volatilityPercent: technical.volatilityPercent,
        newsMentions: relevantNews.map((n) => ({
          title: n.title,
          sentiment: 0,
          relevance: 0.5,
        })),
        activePredictions: activePredictionInputs,
      };

      const llmResult = await analyzeStock(analysisInput);
      if (llmResult) {
        analysisResult = {
          action: llmResult.action,
          confidence: llmResult.confidence,
          entryPrice: llmResult.entryPrice,
          stopLoss: llmResult.stopLoss,
          targetPrice: llmResult.targetPrice,
          maxHoldDays: llmResult.maxHoldDays,
          overallScore: llmResult.overallScore,
          sentimentScore: llmResult.sentimentScore,
          fundamentalScore: llmResult.fundamentalScore,
          technicalScore: llmResult.technicalScore,
          analysisSummary: llmResult.analysisSummary,
          newsSummary: llmResult.newsSummary,
          fundamentalSummary: llmResult.fundamentalSummary,
          technicalSummary: llmResult.technicalSummary,
        };
      }
    }

    const response: TickerAnalysisResponse = {
      ticker,
      companyName: fundamentals?.companyName ?? tickerBase,
      sector: fundamentals?.sector ?? null,
      currentPrice: quote.price,
      priceChange: quote.change,
      priceChangePct: quote.changePercent,
      fundamentals: {
        peRatio: fundamentals?.peRatio ?? null,
        pbRatio: fundamentals?.pbRatio ?? null,
        roe: fundamentals?.roe ?? null,
        debtToEquity: fundamentals?.debtToEquity ?? null,
        dividendYield: fundamentals?.dividendYield ?? null,
        marketCap: fundamentals?.marketCap ?? null,
      },
      technical: technical
        ? {
            trend: technical.trend,
            sma20: technical.sma20,
            sma50: technical.sma50,
            high3Month: technical.high3Month,
            low3Month: technical.low3Month,
            supports: technical.supports,
            resistances: technical.resistances,
            volatilityPercent: technical.volatilityPercent,
          }
        : {
            trend: "UNKNOWN",
            sma20: null,
            sma50: null,
            high3Month: 0,
            low3Month: 0,
            supports: [],
            resistances: [],
            volatilityPercent: 0,
          },
      relevantNews,
      analysis: analysisResult,
    };

    return jsonResponse(successResponse(response), 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Analyze ticker error:", message);
    return jsonResponse(errorResponse(message), 500, origin);
  }
}
