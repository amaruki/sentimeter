/**
 * Scheduler Manager
 *
 * Manages the scheduler state within the API process.
 * Times come from config overrides when set.
 */

import { runDailyAnalysis } from "../jobs/daily-analysis.ts";
import type { JobSchedule } from "../lib/database/types.ts";
import { getSchedulerTimes } from "../lib/config-overrides.ts";
import { logEmitter } from "./log-emitter.ts";

interface ScheduledJob {
  schedule: JobSchedule;
  hour: number;
  minute: number;
  timeout: ReturnType<typeof setTimeout> | null;
}

interface SchedulerState {
  enabled: boolean;
  morningTime: string;
  eveningTime: string;
  nextRun: string | null;
}

let jobs: ScheduledJob[] = [];
let schedulerEnabled = false;

function buildJobs(): ScheduledJob[] {
  const t = getSchedulerTimes();
  return [
    { schedule: "morning", hour: t.morningHour, minute: t.morningMinute, timeout: null },
    { schedule: "evening", hour: t.eveningHour, minute: t.eveningMinute, timeout: null },
  ];
}

function getNextRunTime(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function getNextScheduledRun(): Date | null {
  if (!schedulerEnabled || jobs.length < 2) return null;
  const morning = jobs.find((j) => j.schedule === "morning")!;
  const evening = jobs.find((j) => j.schedule === "evening")!;
  const morningNext = getNextRunTime(morning.hour, morning.minute);
  const eveningNext = getNextRunTime(evening.hour, evening.minute);
  return morningNext < eveningNext ? morningNext : eveningNext;
}

function scheduleJob(job: ScheduledJob): void {
  if (!schedulerEnabled) return;

  const nextRun = getNextRunTime(job.hour, job.minute);
  const delay = nextRun.getTime() - Date.now();

  logEmitter.info(`Scheduled ${job.schedule} job for ${nextRun.toLocaleString("id-ID")}`);

  job.timeout = setTimeout(async () => {
    if (!schedulerEnabled) return;

    logEmitter.info(`Running scheduled ${job.schedule} job...`);

    try {
      await runDailyAnalysis(job.schedule);
      logEmitter.success(`${job.schedule} job completed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logEmitter.error(`${job.schedule} job failed: ${msg}`);
    }

    // Reschedule for tomorrow
    scheduleJob(job);
  }, delay);
}

function stopAllJobs(): void {
  for (const job of jobs) {
    if (job.timeout) {
      clearTimeout(job.timeout);
      job.timeout = null;
    }
  }
}

export function startScheduler(): void {
  if (schedulerEnabled) return;

  schedulerEnabled = true;
  jobs = buildJobs();
  logEmitter.info("Scheduler started");

  for (const job of jobs) {
    scheduleJob(job);
  }
}

export function reloadSchedulerTimes(): void {
  const wasEnabled = schedulerEnabled;
  if (schedulerEnabled) {
    schedulerEnabled = false;
    stopAllJobs();
  }
  jobs = buildJobs();
  if (wasEnabled) {
    schedulerEnabled = true;
    for (const job of jobs) {
      scheduleJob(job);
    }
  }
}

export function stopScheduler(): void {
  if (!schedulerEnabled) return;

  schedulerEnabled = false;
  stopAllJobs();
  logEmitter.info("Scheduler stopped");
}

export function getSchedulerState(): SchedulerState {
  const nextRun = getNextScheduledRun();
  const t = getSchedulerTimes();
  const fmt = (h: number, m: number) =>
    `${h}:${m.toString().padStart(2, "0")} WIB`;

  return {
    enabled: schedulerEnabled,
    morningTime: fmt(t.morningHour, t.morningMinute),
    eveningTime: fmt(t.eveningHour, t.eveningMinute),
    nextRun: nextRun ? nextRun.toISOString() : null,
  };
}

export function isSchedulerEnabled(): boolean {
  return schedulerEnabled;
}
