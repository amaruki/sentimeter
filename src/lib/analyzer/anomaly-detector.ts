/**
 * Anomaly Detector
 *
 * Detects unusual price or volume movements.
 */

import { config } from "../config.ts";
import type { StockQuote } from "../market-data/types.ts";
import type { AnomalyDetected } from "../prediction-tracker/types.ts";

export function detectAnomalies(
  ticker: string,
  quote: StockQuote
): AnomalyDetected[] {
  const anomalies: AnomalyDetected[] = [];
  const { priceChangePct, volumeMultiplier } = config.anomaly;

  // 1. Price Anomaly
  // Check if absolute percentage change is greater than threshold
  if (Math.abs(quote.changePercent) >= priceChangePct) {
    anomalies.push({
      ticker,
      type: "PRICE",
      value: quote.changePercent,
      threshold: priceChangePct,
      message: `Significant price movement: ${quote.changePercent.toFixed(2)}% (Threshold: ${priceChangePct}%)`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Volume Anomaly
  // Check if volume is significantly higher than average
  if (quote.averageVolume && quote.averageVolume > 0) {
    if (quote.volume >= quote.averageVolume * volumeMultiplier) {
      const multiplier = (quote.volume / quote.averageVolume).toFixed(1);
      anomalies.push({
        ticker,
        type: "VOLUME",
        value: quote.volume,
        threshold: volumeMultiplier,
        message: `High volume detected: ${multiplier}x average (Threshold: ${volumeMultiplier}x)`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}
