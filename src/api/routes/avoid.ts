/**
 * Avoid Route
 *
 * GET /api/avoid - Get current avoid/unrecommended tickers (in-memory only)
 */

import { jsonResponse } from "../middleware/cors.ts";
import { successResponse } from "../types.ts";
import { getAvoidItems } from "../../lib/avoid-cache.ts";

export function handleAvoid(request: Request): Response {
  const origin = request.headers.get("Origin");
  const items = getAvoidItems();

  return jsonResponse(
    successResponse({ items, count: items.length }),
    200,
    origin
  );
}
