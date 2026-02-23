/**
 * Price Monitoring Service
 *
 * Periodically checks stock prices and updates prediction status.
 * Broadcasts updates via WebSocket and sends Telegram notifications.
 */

import { updateAllPredictions } from "../lib/prediction-tracker/updater.ts";
import { sendTelegramNotification } from "../lib/notifications/index.ts";
import type {
  StatusUpdate,
  PredictionStatus,
  AnomalyDetected,
} from "../lib/prediction-tracker/types.ts";
import { detectAnomalies } from "../lib/analyzer/anomaly-detector.ts";
import { fetchCurrentQuote } from "../lib/market-data/index.ts";
import { analyzeAnomaly } from "../lib/analyzer/anomaly-analyzer.ts";
import { isMarketOpen } from "../lib/market-hours.ts";

let intervalId: ReturnType<typeof setInterval> | null = null;
let clockIntervalId: ReturnType<typeof setInterval> | null = null;
let broadcastFn: ((data: any) => void) | null = null;
const anomalyCooldowns = new Map<string, number>();

/**
 * Set the broadcast function for WebSocket updates
 */
export function setBroadcastFn(fn: (data: any) => void) {
  broadcastFn = fn;
}

/**
 * Start the heartbeat clock
 */
function startClock() {
  if (clockIntervalId) return;

  clockIntervalId = setInterval(() => {
    if (broadcastFn) {
      broadcastFn({
        type: "HEARTBEAT",
        timestamp: new Date().toISOString(),
      });
    }
  }, 1000);
}

/**
 * Stop the heartbeat clock
 */
function stopClock() {
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
}

/**
 * Start the monitoring loop
 */
export function startMonitoring(intervalMs: number = 15000) {
  if (intervalId) {
    console.warn("⚠️ Monitor already running.");
    return;
  }

  console.log(`⏱️  Starting price monitor (every ${intervalMs}ms)...`);

  // Run immediately first
  void runCheck();
  startClock();

  intervalId = setInterval(() => {
    void runCheck();
  }, intervalMs);
}

/**
 * Stop the monitoring loop
 */
export function stopMonitoring() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    stopClock();
    console.log("🛑 Price monitor stopped.");
  }
}

async function runCheck() {
  try {
    // Check if market is open
    if (!isMarketOpen()) {
      return;
    }

    const result = await updateAllPredictions();

    // 1. Broadcast prices
    if (Object.keys(result.currentPrices).length > 0 && broadcastFn) {
      broadcastFn({
        type: "PRICE_UPDATE",
        prices: result.currentPrices,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Handle status updates
    if (result.statusUpdates.length > 0) {
      if (broadcastFn) {
        broadcastFn({
          type: "STATUS_UPDATE",
          updates: result.statusUpdates,
        });
      }

      for (const update of result.statusUpdates) {
        await notifyStatusChange(update);
      }
    }

    // 3. Anomaly Detection
    // Check tickers that have current prices
    for (const ticker of Object.keys(result.currentPrices)) {
      // Respect cooldown (e.g., 1 hour per ticker) to avoid spam
      const lastAlert = anomalyCooldowns.get(ticker);
      if (lastAlert && Date.now() - lastAlert < 3600000) {
        continue;
      }

      // map detected anomalies to full quotes. We already have the full quotes 
      // in result.currentQuotes from updateAllPredictions().
      const quoteData = result.currentQuotes[ticker];
      if (!quoteData) continue;

      const anomalies = detectAnomalies(ticker, quoteData);

      if (anomalies.length > 0) {
        anomalyCooldowns.set(ticker, Date.now());

        // Call LLM for analysis
        let analysis = "";
        const firstAnomaly = anomalies[0];
        
        if (firstAnomaly) {
          try {
              analysis = await analyzeAnomaly(ticker, firstAnomaly, quoteData);
          } catch (e) {
              console.error(`Failed to analyze anomaly for ${ticker}:`, e);
          }
        }

        // Notify
        for (const anomaly of anomalies) {
          await notifyAnomaly(anomaly, analysis);
        }

        // Broadcast
        if (broadcastFn) {
          broadcastFn({
            type: "ANOMALY_DETECTED",
            anomalies,
            analysis
          });
        }
      }
    }

  } catch (error) {
    console.error("❌ Monitor error:", error);
  }
}

async function notifyStatusChange(update: StatusUpdate) {
  const { ticker, previousStatus, newStatus, price, reason } = update;
  const emoji = getStatusEmoji(newStatus);

  const time = update.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const message = `
${emoji} *${ticker} Status Update*

*Previous:* ${formatStatus(previousStatus)}
*New:* ${formatStatus(newStatus)}

💰 *Price:* ${price}
⏱ *Time:* ${time}

📝 *Details:* ${reason}

_⚠️ Disclaimer: Prices may be delayed by up to 10 mins. Not financial advice. DYOR._
  `.trim();

  await sendTelegramNotification(message);
}

async function notifyAnomaly(anomaly: AnomalyDetected, analysis: string) {
    const emoji = anomaly.type === "PRICE" ? "🚀" : "🔊";
    const message = `
${emoji} *${anomaly.ticker} Anomaly Detected*

*Type:* ${anomaly.type}
*Value:* ${anomaly.type === "PRICE" ? anomaly.value.toFixed(2) + "%" : anomaly.value}
*Details:* ${anomaly.message}

🤖 *AI Analysis:*
${analysis}

_⚠️ Disclaimer: Prices may be delayed by up to 10 mins. Not financial advice. DYOR._
    `.trim();

    await sendTelegramNotification(message);
}

function getStatusEmoji(status: PredictionStatus): string {
  switch (status) {
    case "entry_hit":
      return "🟢";
    case "target_hit":
      return "🎯";
    case "sl_hit":
      return "🛑";
    case "expired":
      return "⏰";
    default:
      return "📢";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toUpperCase();
}
