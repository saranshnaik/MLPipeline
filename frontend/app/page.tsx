"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { ChoiceInput, NumberInput } from "@/components/Fields";
import { ResultPanel } from "@/components/ResultPanel";
import { StatusBadge } from "@/components/StatusBadge";
import {
  BILLING_CHOICES,
  MONTHLY_FIELD,
  PROFILE_CHOICES,
  SERVICE_CHOICES,
  TENURE_FIELD,
  TOTAL_FIELD,
  describeApiError,
  estimateTotalCharges,
  initialValues,
  modelLabel,
  normalize,
  optionsFor,
  presets,
  toPayload,
  type ChoiceField,
  type FieldKey,
  type FormValues,
  type ModelInfo,
  type PredictionResult,
} from "@/lib/customer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Free-tier hosts put idle services to sleep; after this long we tell the user why it is slow.
const SLOW_RESPONSE_MS = 5000;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">{title}</h3>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function Home() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  // null = still connecting, true = API answered, false = API unreachable
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // On page load, ping the API. On a free tier this also wakes a sleeping instance
  // (30-60 s cold start) while the user is still filling in the form.
  useEffect(() => {
    const controller = new AbortController();

    async function connect() {
      try {
        const health = await fetch(`${API_URL}/health`, { signal: controller.signal });
        if (!health.ok) throw new Error(`Health check returned ${health.status}`);
        setServerReady(true);

        const info = await fetch(`${API_URL}/model-info`, { signal: controller.signal });
        if (info.ok) setModelInfo(await info.json());
      } catch {
        if (!controller.signal.aborted) setServerReady(false);
      }
    }

    connect();
    return () => controller.abort();
  }, []);

  function clearOutcome() {
    setResult(null);
    setError("");
  }

  function setField(key: FieldKey, value: string) {
    setValues((previous) => normalize({ ...previous, [key]: value }));
    setActivePreset(null);
    clearOutcome();
  }

  function applyPreset(id: string) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setValues(normalize(preset.values));
    setActivePreset(id);
    clearOutcome();
  }

  function reset() {
    setValues(initialValues);
    setActivePreset(null);
    clearOutcome();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_RESPONSE_MS);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });

      if (!response.ok) {
        throw new Error(describeApiError(response.status, await response.text()));
      }

      setResult((await response.json()) as PredictionResult);
      setServerReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the prediction API.");
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  }

  function renderChoices(fields: ChoiceField[]) {
    return fields.map((field) => (
      <ChoiceInput
        key={field.key}
        field={field}
        value={values[field.key]}
        options={optionsFor(field, values)}
        onChange={setField}
      />
    ));
  }

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)] px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-4 border-b border-slate-800 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              ML Production Project
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Customer Churn Predictor</h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Describe a telecom customer and the model estimates how likely they are to cancel.
            </p>
          </div>
          <StatusBadge ready={serverReady} />
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl backdrop-blur sm:p-8"
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold">Customer details</h2>
              <p className="mt-1 text-sm text-slate-400">Start from an example, then adjust anything you like.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={activePreset === preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                      activePreset === preset.id
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-950/50 hover:border-slate-500"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{preset.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <Section title="Customer profile">
              {renderChoices(PROFILE_CHOICES)}
              <NumberInput field={TENURE_FIELD} value={values.tenure} onChange={setField} />
            </Section>

            <Section title="Services" hint="Add-ons are set automatically when there is no phone or internet service.">
              {renderChoices(SERVICE_CHOICES)}
            </Section>

            <Section title="Contract and billing">
              {renderChoices(BILLING_CHOICES)}
              <NumberInput field={MONTHLY_FIELD} value={values.MonthlyCharges} onChange={setField} />
              <NumberInput
                field={TOTAL_FIELD}
                value={values.TotalCharges}
                onChange={setField}
                hint="Roughly tenure × monthly charges."
                action={
                  <button
                    type="button"
                    onClick={() => setField("TotalCharges", estimateTotalCharges(values))}
                    className="text-xs text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    Estimate
                  </button>
                }
              />
            </Section>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analyzing customer..." : "Predict churn"}
            </button>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
              >
                {error}
                {serverReady === false && (
                  <p className="mt-2 text-red-200">Check that the API is running at {API_URL}.</p>
                )}
              </div>
            )}
          </form>

          <ResultPanel
            result={result}
            loading={loading}
            slow={slow}
            model={modelLabel(modelInfo, serverReady)}
            onReset={reset}
          />
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Educational ML project · Predictions depend on the training data and model quality.
        </footer>
      </div>
    </main>
  );
}
