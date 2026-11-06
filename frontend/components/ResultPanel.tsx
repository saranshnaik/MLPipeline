"use client";

import { useEffect, useRef, useState } from "react";

import { riskLevel, type PredictionResult, type RiskTone } from "@/lib/customer";

const tones: Record<RiskTone, { stroke: string; text: string; box: string }> = {
  low: { stroke: "stroke-emerald-400", text: "text-emerald-300", box: "border-emerald-900 bg-emerald-950/30" },
  elevated: { stroke: "stroke-amber-400", text: "text-amber-300", box: "border-amber-900 bg-amber-950/30" },
  high: { stroke: "stroke-red-400", text: "text-red-300", box: "border-red-900 bg-red-950/30" },
};

// Half circle from left to right; pathLength=100 lets dash values be plain percentages.
const ARC = "M 10 60 A 50 50 0 0 1 110 60";

function Gauge({ percent, tone }: { percent: number; tone: RiskTone }) {
  // Start empty, then grow to the value so the arc animates on mount.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div className="relative mx-auto w-full max-w-[16rem]">
      <svg viewBox="0 0 120 68" className="w-full" role="img" aria-label={`Churn probability ${percent} percent`}>
        <path d={ARC} pathLength={100} fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-slate-800" />
        <path
          d={ARC}
          pathLength={100}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${shown} 100`}
          className={`${tones[tone].stroke} transition-[stroke-dasharray] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-4xl font-bold tabular-nums">{percent}%</p>
        <p className="text-xs text-slate-400">churn probability</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse py-6" aria-hidden="true">
      <div className="mx-auto h-28 w-56 rounded-t-full bg-slate-800" />
      <div className="mx-auto mt-6 h-5 w-40 rounded bg-slate-800" />
      <div className="mx-auto mt-3 h-4 w-56 rounded bg-slate-800/70" />
    </div>
  );
}

type Props = {
  result: PredictionResult | null;
  loading: boolean;
  slow: boolean;
  model: string;
  onReset: () => void;
};

export function ResultPanel({ result, loading, slow, model, onReset }: Props) {
  const percent = result ? Math.round(result.churn_probability * 100) : 0;
  const risk = result ? riskLevel(result.churn_probability) : null;
  const panelRef = useRef<HTMLElement>(null);

  // On narrow screens the panel sits below the form; bring a fresh result into view.
  // block: "nearest" means this does nothing when the panel is already visible (desktop).
  useEffect(() => {
    if (!result) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [result]);

  return (
    <aside
      ref={panelRef}
      aria-live="polite"
      className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur sm:p-8 lg:sticky lg:top-6"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Prediction</p>

      {loading ? (
        <>
          <Skeleton />
          {slow && (
            <p className="text-center text-sm text-amber-300">
              The server is waking up (free tier). The first request can take up to a minute.
            </p>
          )}
        </>
      ) : result && risk ? (
        <div className="mt-6">
          <Gauge key={result.churn_probability} percent={percent} tone={risk.tone} />

          <div className={`mt-6 rounded-xl border p-5 ${tones[risk.tone].box}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{risk.label}</p>
            <h2 className={`mt-1 text-xl font-bold ${tones[risk.tone].text}`}>
              {result.churn ? "Likely to churn" : "Not likely to churn"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{risk.summary}</p>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            This is the model&apos;s estimate, not a guarantee. Risk bands: under 30% low, 30-50% elevated,
            50% and above high.
          </p>

          <button
            type="button"
            onClick={onReset}
            className="mt-6 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Start over
          </button>
        </div>
      ) : (
        <div className="py-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl text-cyan-300">
            ↗
          </div>
          <h2 className="text-lg font-semibold">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-400">
            Pick an example customer or fill in the details, then press <strong>Predict churn</strong>.
          </p>
        </div>
      )}

      <div className="mt-8 border-t border-slate-800 pt-4">
        <p className="text-xs text-slate-400">
          Model: <span className="text-slate-400">{model}</span>
        </p>
      </div>
    </aside>
  );
}
