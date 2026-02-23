/**
 * Status Checker
 *
 * Checks current prices against prediction levels to determine status changes.
 */

import type { PredictionStatus, StatusUpdate, TrackedPrediction } from "./types.ts";

const STALE_PENDING_DAYS = 3;

/**
 * Check if prediction status should change based on current price
 */
export function checkStatusChange(
  prediction: TrackedPrediction,
  currentPrice: number
): StatusUpdate | null {
  const { id, ticker, status, entryPrice, stopLoss, targetPrice, maxHoldDays, daysActive } =
    prediction;

  // Already closed - no changes possible
  if (status === "target_hit" || status === "sl_hit" || status === "expired") {
    return null;
  }

  // Pending - check if entry price is hit
  if (status === "pending") {
    // For ANY order type (LIMIT or MARKET): auto-transition when price touches entry
    // A MARKET order buys right at the open price, but we just check if it touches the entry.
    // We treat both similarly for real-time tracking: if the price hits or drops below the entryPrice, we enter.
    const tolerance = 0.005; // 0.5% tolerance
    const upperBound = entryPrice * (1 + tolerance);
    
    // We consider the entry hit if current price is <= upperBound of entry price
    if (currentPrice <= upperBound) {
      return {
        id,
        ticker,
        previousStatus: status,
        newStatus: "entry_hit",
        price: currentPrice,
        reason: `Entry price ${entryPrice} reached at ${currentPrice}`,
        timestamp: new Date(),
      };
    }

    // Auto-expire stale pending positions (>3 days without entry hit)
    if (daysActive >= STALE_PENDING_DAYS) {
      return {
        id,
        ticker,
        previousStatus: status,
        newStatus: "expired",
        price: currentPrice,
        reason: `Pending entry not hit after ${daysActive} days (limit: ${STALE_PENDING_DAYS})`,
        timestamp: new Date(),
      };
    }

    // Check if expired while pending (legacy: maxHoldDays)
    if (daysActive >= maxHoldDays) {
      return {
        id,
        ticker,
        previousStatus: status,
        newStatus: "expired",
        price: currentPrice,
        reason: `Max hold days (${maxHoldDays}) exceeded without entry`,
        timestamp: new Date(),
      };
    }

    return null;
  }

  // Entry hit - check for target, stop loss, or expiry
  if (status === "entry_hit") {
    // Check stop loss first (priority for risk management)
    if (currentPrice <= stopLoss) {
      return {
        id,
        ticker,
        previousStatus: status,
        newStatus: "sl_hit",
        price: currentPrice,
        reason: `Stop loss ${stopLoss} triggered at ${currentPrice}`,
        timestamp: new Date(),
      };
    }

    // Check target
    if (currentPrice >= targetPrice) {
      return {
        id,
        ticker,
        previousStatus: status,
        newStatus: "target_hit",
        price: currentPrice,
        reason: `Target price ${targetPrice} reached at ${currentPrice}`,
        timestamp: new Date(),
      };
    }

    // Check expiry
    if (daysActive >= maxHoldDays) {
      return {
        id,
        ticker,
        previousStatus: status,
        newStatus: "expired",
        price: currentPrice,
        reason: `Max hold days (${maxHoldDays}) exceeded, exiting at ${currentPrice}`,
        timestamp: new Date(),
      };
    }

    return null;
  }

  return null;
}

/**
 * Check if current price has hit the target price level
 * Uses a small tolerance to account for price fluctuations
 */
function isPriceHit(currentPrice: number, targetPrice: number): boolean {
  const tolerance = 0.005; // 0.5% tolerance
  const lowerBound = targetPrice * (1 - tolerance);
  const upperBound = targetPrice * (1 + tolerance);
  return currentPrice >= lowerBound && currentPrice <= upperBound;
}

/**
 * Calculate P&L percentage
 */
export function calculatePnlPct(entryPrice: number, exitPrice: number): number {
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

/**
 * Calculate distance to price level as percentage
 */
export function calculateDistancePct(currentPrice: number, targetPrice: number): number {
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

/**
 * Calculate risk/reward ratio
 */
export function calculateRiskReward(
  entryPrice: number,
  stopLoss: number,
  targetPrice: number
): number {
  const risk = entryPrice - stopLoss;
  const reward = targetPrice - entryPrice;

  if (risk <= 0) return 0;
  return reward / risk;
}

/**
 * Calculate days between two dates
 */
export function calculateDaysActive(startDate: string, endDate?: string): number {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
