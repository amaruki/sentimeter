/**
 * Config Routes
 *
 * GET /api/config - Get app config (editable fields)
 * PATCH /api/config - Update config overrides
 */

import { jsonResponse } from "../middleware/cors.ts";
import { successResponse, errorResponse } from "../types.ts";
import { config } from "../../lib/config.ts";
import {
  getSchedulerTimes,
  getEffectiveConfig,
  updateOverrides,
  type ConfigOverrides,
} from "../../lib/config-overrides.ts";
import {
  getSchedulerState,
  reloadSchedulerTimes,
} from "../scheduler-manager.ts";

export interface ConfigResponse {
  scheduler: {
    morningHour: number;
    morningMinute: number;
    eveningHour: number;
    eveningMinute: number;
    morningTime: string;
    eveningTime: string;
    nextRun: string | null;
  };
  telegram: {
    configured: boolean;
    botToken: string;
    chatId: string;
  };
  anomaly: {
    priceChangePct: number;
    volumeMultiplier: number;
  };
  llm: {
    baseUrl: string;
    model: string;
    apiKey: string;
    configured: boolean;
  };
}

function buildConfigResponse(): ConfigResponse {
  const state = getSchedulerState();
  const effective = getEffectiveConfig(config);
  const t = getSchedulerTimes();

  return {
    scheduler: {
      morningHour: t.morningHour,
      morningMinute: t.morningMinute,
      eveningHour: t.eveningHour,
      eveningMinute: t.eveningMinute,
      morningTime: state.morningTime,
      eveningTime: state.eveningTime,
      nextRun: state.nextRun,
    },
    telegram: {
      configured: Boolean(
        effective.telegram.botToken?.trim() && effective.telegram.chatId?.trim()
      ),
      botToken: effective.telegram.botToken ?? "",
      chatId: effective.telegram.chatId ?? "",
    },
    anomaly: {
      priceChangePct: effective.anomaly.priceChangePct,
      volumeMultiplier: effective.anomaly.volumeMultiplier,
    },
    llm: {
      baseUrl: effective.antigravity.baseUrl,
      model: effective.antigravity.model,
      apiKey: effective.antigravity.apiKey ?? "",
      configured: Boolean(
        effective.antigravity.apiKey?.trim() ||
          effective.antigravity.baseUrl?.trim()
      ),
    },
  };
}

export function handleGetConfig(request: Request): Response {
  const origin = request.headers.get("Origin");
  try {
    const data = buildConfigResponse();
    return jsonResponse(successResponse(data), 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(errorResponse(message), 500, origin);
  }
}

function parsePatchBody(body: unknown): ConfigOverrides | null {
  if (body === null || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const out: ConfigOverrides = {};

  if (o.scheduler && typeof o.scheduler === "object") {
    const s = o.scheduler as Record<string, unknown>;
    out.scheduler = {};
    if (typeof s.morningHour === "number") out.scheduler.morningHour = s.morningHour;
    if (typeof s.morningMinute === "number") out.scheduler.morningMinute = s.morningMinute;
    if (typeof s.eveningHour === "number") out.scheduler.eveningHour = s.eveningHour;
    if (typeof s.eveningMinute === "number") out.scheduler.eveningMinute = s.eveningMinute;
  }
  if (o.telegram && typeof o.telegram === "object") {
    const t = o.telegram as Record<string, unknown>;
    out.telegram = {};
    if (typeof t.botToken === "string") out.telegram.botToken = t.botToken;
    if (typeof t.chatId === "string") out.telegram.chatId = t.chatId;
  }
  if (o.anomaly && typeof o.anomaly === "object") {
    const a = o.anomaly as Record<string, unknown>;
    out.anomaly = {};
    if (typeof a.priceChangePct === "number") out.anomaly.priceChangePct = a.priceChangePct;
    if (typeof a.volumeMultiplier === "number") out.anomaly.volumeMultiplier = a.volumeMultiplier;
  }
  if (o.llm && typeof o.llm === "object") {
    const l = o.llm as Record<string, unknown>;
    out.llm = {};
    if (typeof l.baseUrl === "string") out.llm.baseUrl = l.baseUrl;
    if (typeof l.model === "string") out.llm.model = l.model;
    if (typeof l.apiKey === "string") out.llm.apiKey = l.apiKey;
  }

  if (
    !out.scheduler &&
    !out.telegram &&
    !out.anomaly &&
    !out.llm
  ) {
    return null;
  }
  return out;
}

export async function handlePatchConfig(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        errorResponse("Invalid JSON body"),
        400,
        origin
      );
    }

    const partial = parsePatchBody(body);
    if (!partial) {
      return jsonResponse(
        errorResponse("No valid config fields to update"),
        400,
        origin
      );
    }

    await updateOverrides(partial);
    if (partial.scheduler) {
      reloadSchedulerTimes();
    }
    const data = buildConfigResponse();
    return jsonResponse(successResponse(data), 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(errorResponse(message), 500, origin);
  }
}
