import { AnomalyDetected } from "../prediction-tracker/types.ts";
import { StockQuote } from "../market-data/types.ts";
import { generateContent, type LLMResponse } from "./llm-client.ts";

interface AnomalyAnalysisResult {
    analysis: string;
    isSignificant: boolean;
    reason: string;
}

export async function analyzeAnomaly(ticker: string, anomaly: AnomalyDetected, quote: StockQuote): Promise<string> {
    const prompt = `
Analyze this stock anomaly for ${ticker}:
- Type: ${anomaly.type}
- Value: ${anomaly.value.toFixed(2)}
- Threshold: ${anomaly.threshold}
- Current Price: ${quote.price}
- Volume: ${quote.volume}
- Avg Volume: ${quote.averageVolume || "N/A"}
- Message: ${anomaly.message}

Is this movement likely due to noise, news, or a pump/dump?
Briefly explain the potential cause in 1-2 sentences.
    `.trim();

    try {
        const response = await generateContent<AnomalyAnalysisResult>(prompt, `
            You are a financial analyst. Analyze the stock anomaly data provided.
            Output JSON only: { "analysis": "string", "isSignificant": boolean, "reason": "string" }
        `);

        if (response.success && response.data) {
            return response.data.analysis;
        } else {
             // Fallback if structured parsing fails but we have text (though generateContent tries to force JSON)
             // For now, return a generic message or error
             return `AI analysis failed: ${response.error || "Unknown error"}`;
        }
    } catch (error) {
        return "AI analysis unavailable.";
    }
}
