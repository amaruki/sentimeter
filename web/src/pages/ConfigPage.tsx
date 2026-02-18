/**
 * Config Page
 *
 * Editable settings: schedule times, Telegram, anomaly, LLM.
 */

import { useState, useCallback, useEffect } from "react";
import {
  LoadingState,
  ErrorState,
  SchedulerPanel,
  Card,
  useToast,
} from "@/components";
import { useScheduler, useConfig, patchConfig, type AppConfig, type ConfigPatch } from "@/lib";

function ConfigSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  hint,
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (v: string | number) => void;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => {
          if (type === "number") {
            const n = e.target.valueAsNumber;
            onChange(Number.isNaN(n) ? 0 : n);
          } else {
            onChange(e.target.value);
          }
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="input w-full text-sm"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function ConfigPage() {
  const {
    state: schedulerState,
    loading: schedulerLoading,
    toggle: toggleScheduler,
  } = useScheduler();
  const { data: config, loading: configLoading, error: configError, refetch } = useConfig();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<AppConfig>>({});

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const updateForm = useCallback(
    (section: keyof AppConfig, key: string, value: string | number) => {
      setForm((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] as object),
          [key]: value,
        },
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!config) return;
    const patch: ConfigPatch = {};
    if (form.scheduler) {
      patch.scheduler = {
        morningHour: form.scheduler.morningHour ?? config.scheduler.morningHour,
        morningMinute: form.scheduler.morningMinute ?? config.scheduler.morningMinute,
        eveningHour: form.scheduler.eveningHour ?? config.scheduler.eveningHour,
        eveningMinute: form.scheduler.eveningMinute ?? config.scheduler.eveningMinute,
      };
    }
    if (form.telegram) {
      patch.telegram = {
        botToken: form.telegram.botToken ?? "",
        chatId: form.telegram.chatId ?? "",
      };
    }
    if (form.anomaly) {
      patch.anomaly = {
        priceChangePct: form.anomaly.priceChangePct ?? config.anomaly.priceChangePct,
        volumeMultiplier: form.anomaly.volumeMultiplier ?? config.anomaly.volumeMultiplier,
      };
    }
    if (form.llm) {
      patch.llm = {
        baseUrl: form.llm.baseUrl ?? config.llm.baseUrl,
        model: form.llm.model ?? config.llm.model,
        apiKey: form.llm.apiKey ?? config.llm.apiKey,
      };
    }
    setSaving(true);
    try {
      await patchConfig(patch);
      showToast("Config saved.", "success");
      void refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save config", "error");
    } finally {
      setSaving(false);
    }
  }, [config, form, refetch, showToast]);

  const loading = configLoading || (schedulerLoading && !schedulerState);
  const error = configError;

  if (loading && !config) {
    return <LoadingState message="Loading config..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void refetch();
          window.location.reload();
        }}
      />
    );
  }

  const s = form.scheduler ?? config?.scheduler;
  const t = form.telegram ?? config?.telegram;
  const a = form.anomaly ?? config?.anomaly;
  const l = form.llm ?? config?.llm;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Config</h1>
          <p className="text-gray-500">
            Schedule times, Telegram bot, anomaly detection, and LLM settings.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !config}
          className="btn-primary"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <ConfigSection
        title="When to schedule"
        subtitle="Daily analysis runs at these times (WIB)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SchedulerPanel
            state={schedulerState}
            loading={schedulerLoading}
            onToggle={() => void toggleScheduler()}
          />
        </div>
        {s && (
          <Card className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field
                label="Morning hour"
                type="number"
                value={s.morningHour ?? 7}
                onChange={(v) => updateForm("scheduler", "morningHour", Number(v))}
                min={0}
                max={23}
              />
              <Field
                label="Morning minute"
                type="number"
                value={s.morningMinute ?? 30}
                onChange={(v) => updateForm("scheduler", "morningMinute", Number(v))}
                min={0}
                max={59}
              />
              <Field
                label="Evening hour"
                type="number"
                value={s.eveningHour ?? 15}
                onChange={(v) => updateForm("scheduler", "eveningHour", Number(v))}
                min={0}
                max={23}
              />
              <Field
                label="Evening minute"
                type="number"
                value={s.eveningMinute ?? 30}
                onChange={(v) => updateForm("scheduler", "eveningMinute", Number(v))}
                min={0}
                max={59}
              />
            </div>
            {config?.scheduler?.nextRun && (
              <p className="text-xs text-gray-400 mt-2">
                Next run: {new Date(config.scheduler.nextRun).toLocaleString("id-ID")}
              </p>
            )}
          </Card>
        )}
      </ConfigSection>

      <ConfigSection title="Telegram" subtitle="Bot token and chat ID for notifications.">
        <Card>
          <Field
            label="Bot token"
            type="password"
            value={t?.botToken ?? ""}
            onChange={(v) => updateForm("telegram", "botToken", String(v))}
            placeholder="Leave empty to keep current"
          />
          <Field
            label="Chat ID"
            value={t?.chatId ?? ""}
            onChange={(v) => updateForm("telegram", "chatId", String(v))}
            placeholder="Telegram chat ID"
          />
        </Card>
      </ConfigSection>

      <ConfigSection title="Anomaly detection" subtitle="Thresholds for alerts.">
        <Card>
          <Field
            label="Price change %"
            type="number"
            value={a?.priceChangePct ?? 5}
            onChange={(v) => updateForm("anomaly", "priceChangePct", Number(v))}
            step={0.5}
            hint="Alert when price moves beyond this percentage."
          />
          <Field
            label="Volume multiplier"
            type="number"
            value={a?.volumeMultiplier ?? 3}
            onChange={(v) => updateForm("anomaly", "volumeMultiplier", Number(v))}
            step={0.1}
            hint="Alert when volume exceeds average × this factor."
          />
        </Card>
      </ConfigSection>

      <ConfigSection title="LLM (Antigravity)" subtitle="Model and endpoint.">
        <Card>
          <Field
            label="Base URL"
            value={l?.baseUrl ?? ""}
            onChange={(v) => updateForm("llm", "baseUrl", String(v))}
            placeholder="http://127.0.0.1:8045/v1"
          />
          <Field
            label="Model"
            value={l?.model ?? ""}
            onChange={(v) => updateForm("llm", "model", String(v))}
            placeholder="gemini-2.0-flash"
          />
          <Field
            label="API key"
            type="password"
            value={l?.apiKey ?? ""}
            onChange={(v) => updateForm("llm", "apiKey", String(v))}
            placeholder="Leave empty to keep current"
          />
        </Card>
      </ConfigSection>
    </div>
  );
}
