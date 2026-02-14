/**
 * Market Outlook Route
 *
 * GET /api/market-outlook - Get current market outlook/sentiment data
 */

import { jsonResponse } from "../middleware/cors.ts";
import { successResponse } from "../types.ts";
import { getMarketOutlook } from "../../lib/market-outlook-cache.ts";

export function handleMarketOutlook(request: Request): Response {
  const origin = request.headers.get("Origin");
  const outlook = getMarketOutlook();

  return jsonResponse(
    successResponse(outlook),
    200,
    origin
  );
}
