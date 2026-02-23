import { test, expect, describe } from "bun:test";
import { z } from "zod";
import { tickerExtractionSchema, stockAnalysisSchema } from "./schemas.ts";

describe("LLM Response Validation - Ticker Extraction", () => {
  test("valid ticker extraction data passes", () => {
    const data = {
      tickers: [
        { code: "BBCA", sentiment: 0.5, relevance: 0.8, reason: "Good earnings" },
        { code: "TLKM", sentiment: -0.2, relevance: 0.5, reason: "Regulatory news" }
      ]
    };
    
    const result = tickerExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tickers[0]?.code).toBe("BBCA");
    }
  });

  test("missing required field fails", () => {
    const data = {
      tickers: [
        { code: "BBCA", sentiment: 0.5 } // missing relevance and reason
      ]
    };
    
    const result = tickerExtractionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  test("invalid sentiment range fails", () => {
    const data = {
      tickers: [
        { code: "BBCA", sentiment: 5, relevance: 0.8, reason: "Out of range" }
      ]
    };
    
    const result = tickerExtractionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("LLM Response Validation - Stock Analysis", () => {
  test("valid stock analysis data passes", () => {
    const data = {
      action: "BUY",
      confidence: 8,
      entryPrice: 10000,
      stopLoss: 9500,
      targetPrice: 11000,
      maxHoldDays: 14,
      orderType: "LIMIT",
      scores: {
        sentiment: 80,
        fundamental: 75,
        technical: 85,
        overall: 80
      },
      reasoning: {
        news: "Positive",
        fundamental: "Strong",
        technical: "Bullish",
        summary: "Buy now"
      }
    };
    
    const result = stockAnalysisSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  test("defaults previousPredictionUpdates if missing", () => {
    const data = {
      action: "HOLD",
      confidence: 5,
      entryPrice: 5000,
      stopLoss: 4800,
      targetPrice: 5500,
      maxHoldDays: 10,
      scores: {
        sentiment: 50, fundamental: 50, technical: 50, overall: 50
      },
      reasoning: {
        news: "Neutral", fundamental: "Neutral", technical: "Neutral", summary: "Hold"
      }
    };
    
    const result = stockAnalysisSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousPredictionUpdates).toEqual([]);
    }
  });
});
