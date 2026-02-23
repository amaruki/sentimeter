import { z } from "zod";

/**
 * Ticker Extraction Schema
 */
export const tickerExtractionSchema = z.object({
  tickers: z.array(
    z.object({
      code: z.string().toUpperCase().min(1),
      sentiment: z.number().min(-1).max(1),
      relevance: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
});

/**
 * Stock Analysis Schema
 */
export const stockAnalysisSchema = z.object({
  action: z.enum(["BUY", "HOLD", "AVOID"]),
  confidence: z.number().min(1).max(10),
  entryPrice: z.number().nonnegative(),
  stopLoss: z.number().nonnegative(),
  targetPrice: z.number().nonnegative(),
  maxHoldDays: z.number().int().positive(),
  orderType: z.enum(["LIMIT", "MARKET"]).default("LIMIT"),
  scores: z.object({
    sentiment: z.number().min(0).max(100),
    fundamental: z.number().min(0).max(100),
    technical: z.number().min(0).max(100),
    overall: z.number().min(0).max(100),
  }),
  reasoning: z.object({
    news: z.string(),
    fundamental: z.string(),
    technical: z.string(),
    summary: z.string(),
  }),
  previousPredictionUpdates: z.array(
    z.object({
      ticker: z.string().toUpperCase(),
      action: z.enum(["HOLD", "EXIT", "TAKE_PROFIT", "ADD"]),
      reason: z.string(),
      newStopLoss: z.number().nonnegative().optional(),
      newTarget: z.number().nonnegative().optional(),
    })
  ).optional().default([]),
});

export type TickerExtractionResponse = z.infer<typeof tickerExtractionSchema>;
export type StockAnalysisResponse = z.infer<typeof stockAnalysisSchema>;
