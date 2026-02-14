/**
 * Config Overrides
 *
 * Persisted overrides (data/config-overrides.json) merged with env config.
 * Sync in-memory state; load at startup, update on write.
 */

import { mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";

export interface ConfigOverrides {
  scheduler?: {
    morningHour?: number;
    morningMinute?: number;
    eveningHour?: number;
    eveningMinute?: number;
  };
  telegram?: {
    botToken?: string;
    chatId?: string;
  };
  anomaly?: {
    priceChangePct?: number;
    volumeMultiplier?: number;
  };
  llm?: {
    baseUrl?: string;
    model?: string;
    apiKey?: string;
  };
}

const DEFAULT_SCHEDULER = {
  morningHour: 7,
  morningMinute: 30,
  eveningHour: 15,
  eveningMinute: 30,
};

const DATA_DIR = "data";
const CONFIG_PATH = `${DATA_DIR}/config-overrides.json`;

let overrides: ConfigOverrides = {};

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export function loadOverrides(): void {
  try {
    if (existsSync(CONFIG_PATH)) {
      const text = readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(text) as ConfigOverrides;
      overrides = typeof parsed === "object" && parsed !== null ? parsed : {};
    } else {
      overrides = {};
    }
  } catch {
    overrides = {};
  }
}

export function getOverrides(): ConfigOverrides {
  return { ...overrides };
}

export function getSchedulerTimes(): {
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
} {
  const s = overrides.scheduler ?? {};
  return {
    morningHour: s.morningHour ?? DEFAULT_SCHEDULER.morningHour,
    morningMinute: s.morningMinute ?? DEFAULT_SCHEDULER.morningMinute,
    eveningHour: s.eveningHour ?? DEFAULT_SCHEDULER.eveningHour,
    eveningMinute: s.eveningMinute ?? DEFAULT_SCHEDULER.eveningMinute,
  };
}

export async function updateOverrides(partial: ConfigOverrides): Promise<void> {
  await ensureDataDir();
  overrides = {
    ...overrides,
    ...(partial.scheduler && {
      scheduler: { ...overrides.scheduler, ...partial.scheduler },
    }),
    ...(partial.telegram && {
      telegram: { ...overrides.telegram, ...partial.telegram },
    }),
    ...(partial.anomaly && {
      anomaly: { ...overrides.anomaly, ...partial.anomaly },
    }),
    ...(partial.llm && {
      llm: { ...overrides.llm, ...partial.llm },
    }),
  };
  await Bun.write(CONFIG_PATH, JSON.stringify(overrides, null, 2));
}

export interface EnvConfig {
  telegram: { botToken?: string; chatId?: string };
  anomaly: { priceChangePct: number; volumeMultiplier: number };
  antigravity: { baseUrl: string; apiKey: string; model: string };
}

export function getEffectiveConfig(env: EnvConfig): EnvConfig {
  const o = overrides;
  return {
    telegram: {
      botToken: o.telegram?.botToken ?? env.telegram.botToken,
      chatId: o.telegram?.chatId ?? env.telegram.chatId,
    },
    anomaly: {
      priceChangePct: o.anomaly?.priceChangePct ?? env.anomaly.priceChangePct,
      volumeMultiplier: o.anomaly?.volumeMultiplier ?? env.anomaly.volumeMultiplier,
    },
    antigravity: {
      baseUrl: o.llm?.baseUrl ?? env.antigravity.baseUrl,
      apiKey: o.llm?.apiKey ?? env.antigravity.apiKey,
      model: o.llm?.model ?? env.antigravity.model,
    },
  };
}
