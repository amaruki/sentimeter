import { z } from "zod";

/**
 * Ticker Extraction Schema
 */
export const tickerExtractionSchema = z.object({
  tickers: z.array(
    z.preprocess(
      (val) => {
        if (typeof val === "string") {
          return { code: val, sentiment: 0, relevance: 0.5, reason: "Extracted from text" };
        }
        if (val && typeof val === "object") {
          const v = val as any;
          return {
            ...v,
            code: typeof v.code === "string" ? v.code : String(v.code || v.ticker || v.name || "UNKNOWN"),
            sentiment: typeof v.sentiment === "number" ? v.sentiment : 0,
            relevance: typeof v.relevance === "number" ? v.relevance : 0.5,
            reason: typeof v.reason === "string" ? v.reason : "Extracted from text",
          };
        }
        return val;
      },
      z.object({
        code: z.string().toUpperCase().min(1),
        sentiment: z.number().min(-1).max(1),
        relevance: z.number().min(0).max(1),
        reason: z.string(),
      })
    )
  ),
});

/**
 * Stock Analysis Schema
 */
export const stockAnalysisSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  },
  z.object({
    action: z.enum(["BUY", "HOLD", "AVOID"]),
    confidence: z.number().min(1).max(10),
    entryPrice: z.number().nonnegative(),
    stopLoss: z.number().nonnegative(),
    targetPrice: z.number().nonnegative(),
    maxHoldDays: z.number().int().positive(),
    orderType: z.enum(["LIMIT", "MARKET"]).default("LIMIT"),
    scores: z.preprocess((val) => {
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return { sentiment: 0, fundamental: 0, technical: 0, overall: 0 }; }
      }
      return val;
    }, z.object({
      sentiment: z.number().min(0).max(100),
      fundamental: z.number().min(0).max(100),
      technical: z.number().min(0).max(100),
      overall: z.number().min(0).max(100),
    })),
    reasoning: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return { summary: val, news: "", fundamental: "", technical: "" };
        }
      }
      return val;
    }, z.object({
      news: z.string().optional().default(""),
      fundamental: z.string().optional().default(""),
      technical: z.string().optional().default(""),
      summary: z.string().optional().default(""),
    })),
    previousPredictionUpdates: z.array(
      z.preprocess(
        (val) => {
           if (typeof val === "string") {
             try { return JSON.parse(val); } catch { return val; }
           }
           return val;
        },
        z.object({
          ticker: z.string().toUpperCase(),
          action: z.enum(["HOLD", "EXIT", "TAKE_PROFIT", "ADD"]),
          reason: z.string(),
          newStopLoss: z.number().nonnegative().optional(),
          newTarget: z.number().nonnegative().optional(),
        })
      )
    ).optional().default([]),
  })
);

export type TickerExtractionResponse = z.infer<typeof tickerExtractionSchema>;
export type StockAnalysisResponse = z.infer<typeof stockAnalysisSchema>;
