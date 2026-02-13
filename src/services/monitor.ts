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
} from "../lib/prediction-tracker/types.ts";

let intervalId: ReturnType<typeof setInterval> | null = null;
let broadcastFn: ((data: any) => void) | null = null;

/**
 * Set the broadcast function for WebSocket updates
 */
export function setBroadcastFn(fn: (data: any) => void) {
  broadcastFn = fn;
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
    console.log("🛑 Price monitor stopped.");
  }
}

async function runCheck() {
  try {
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
      // Broadcast updates
      if (broadcastFn) {
        broadcastFn({
          type: "STATUS_UPDATE",
          updates: result.statusUpdates,
        });
      }

      // Send notifications
      for (const update of result.statusUpdates) {
        await notifyStatusChange(update);
      }
    }
  } catch (error) {
    console.error("❌ Monitor error:", error);
  }
}

async function notifyStatusChange(update: StatusUpdate) {
  const { ticker, previousStatus, newStatus, price, reason } = update;
  const emoji = getStatusEmoji(newStatus);

  const message = `
${emoji} *${ticker} Update*

Status: ${formatStatus(previousStatus)} ➡️ ${formatStatus(newStatus)}
Price: ${price}
Reason: ${reason}
Time: ${update.timestamp.toLocaleTimeString("id-ID")}
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
