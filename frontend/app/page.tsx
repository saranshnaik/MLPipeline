"use client"

import {useState} from "react";
import type { FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type Customer = {
  gender: string;
  SeniorCitizen: number;
  Partner: string;
  Dependents: string;
  tenure: number;
  PhoneService: string;
  MultipleLines: string;
  InternetService: string;
  OnlineSecurity: string;
  OnlineBackup: string;
  DeviceProtection: string;
  TechSupport: string;
  StreamingTV: string;
  StreamingMovies: string;
  Contract: string;
  PaperlessBilling: string;
  PaymentMethod: string;
  MonthlyCharges: number;
  TotalCharges: number;
};

type PredictionResult = {
  prediction: number;
  churn: boolean;
  churn_probability: number;
}

const initialCustomer: Customer = {
  gender: "Female",
  SeniorCitizen: 0,
  Partner: "Yes",
  Dependents: "No",
  tenure: 12,
  PhoneService: "Yes",
  MultipleLines: "No",
  InternetService: "DSL",
  OnlineSecurity: "No",
  OnlineBackup: "No",
  DeviceProtection: "No",
  TechSupport: "No",
  StreamingTV: "No",
  StreamingMovies: "No",
  Contract: "month-to-month",
  PaperlessBilling: "Yes",
  PaymentMethod: "Electronic check",
  MonthlyCharges: 70,
  TotalCharges: 840,
};

const selectFields: {
  key: keyof Customer;
  label: string;
  options: string[];
}[] = [
  { key: "gender", label: "Gender", options: ["Female", "Male"] },
  { key: "Partner", label: "Has a partner?", options: ["Yes", "No"] },
  { key: "Dependents", label: "Has dependents?", options: ["Yes", "No"] },
  { key: "PhoneService", label: "Phone service", options: ["Yes", "No"] },
  { key: "MultipleLines", label: "Multiple lines", options: ["Yes", "No", "No phone service"] },
  { key: "InternetService", label: "Internet service", options: ["DSL", "Fiber optic", "No"] },
  { key: "OnlineSecurity", label: "Online security", options: ["Yes", "No", "No internet service"] },
  { key: "OnlineBackup", label: "Online backup", options: ["Yes", "No", "No internet service"] },
  { key: "DeviceProtection", label: "Device protection", options: ["Yes", "No", "No internet service"] },
  { key: "TechSupport", label: "Tech support", options: ["Yes", "No", "No internet service"] },
  { key: "StreamingTV", label: "Streaming TV", options: ["Yes", "No", "No internet service"] },
  { key: "StreamingMovies", label: "Streaming movies", options: ["Yes", "No", "No internet service"] },
  { key: "Contract", label: "Contract type", options: ["Month-to-month", "One year", "Two year"] },
  { key: "PaperlessBilling", label: "Paperless billing", options: ["Yes", "No"] },
  { key: "PaymentMethod", label: "Payment method", options: ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"] },
];

const numberFields: {
  key: "SeniorCitizen" | "tenure" | "MonthlyCharges" | "TotalCharges";
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "SeniorCitizen", label: "Senior citizen (0 or 1)", min: 0, max: 1, step: 1 },
  { key: "tenure", label: "Tenure (months)", min: 0, max: 100, step: 1 },
  { key: "MonthlyCharges", label: "Monthly charges ($)", min: 0, max: 10000, step: 0.01 },
  { key: "TotalCharges", label: "Total charges ($)", min: 0, max: 100000, step: 0.01 },
];


export default function Home() {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: keyof Customer, value: string) {
    setCustomer((previous) => ({
      ...previous,
      [key]:
      key === "SeniorCitizen" ||
      key === "tenure" ||
      key === "MonthlyCharges" ||
      key === "TotalCharges"
      ? Number(value) 
      : value,
    }));
    setResult(null);
    setError("");
  }

  async function handleSubmit(event: Parameters<NonNullable<React.ComponentProps<"form">["onSubmit"]>>[0]) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`API returned ${response.status}: ${details}`);
      }

      const data: PredictionResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to prediction API."
      );
    } finally {
      setLoading(false);
    }
    
  }

  const probability = result
    ? Math.round(result.churn_probability * 100)
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-4 border-b border-slate-800 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              ML Production Project
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Customer Churn Predictor
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Enter customer details to estimate churn probability using your
              trained machine learning model.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-900 bg-emerald-950/50 px-4 py-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Prediction dashboard
          </div>
        </header>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-8"
          >
            <div className="mb-7">
              <h2 className="text-xl font-semibold">Customer details</h2>
              <p className="mt-1 text-sm text-slate-400">
                All fields are required by the model.
              </p>
            </div>

            <section className="mb-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Customer profile
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectFields.slice(0, 3).map((field) => (
                  <label key={field.key} className="text-sm text-slate-300">
                    {field.label}
                    <select
                      value={String(customer[field.key])}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-400"
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                {numberFields.slice(0, 2).map((field) => (
                  <label key={field.key} className="text-sm text-slate-300">
                    {field.label}
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      required
                      value={customer[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Services
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectFields.slice(3, 12).map((field) => (
                  <label key={field.key} className="text-sm text-slate-300">
                    {field.label}
                    <select
                      value={String(customer[field.key])}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Contract and billing
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectFields.slice(12).map((field) => (
                  <label key={field.key} className="text-sm text-slate-300">
                    {field.label}
                    <select
                      value={String(customer[field.key])}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                {numberFields.slice(2).map((field) => (
                  <label key={field.key} className="text-sm text-slate-300">
                    {field.label}
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      required
                      value={customer[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
                    />
                  </label>
                ))}
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analyzing customer..." : "Predict churn"}
            </button>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
              >
                {error}
                <p className="mt-2 text-red-200">
                  Check that FastAPI is running at {API_URL}.
                </p>
              </div>
            )}
          </form>

          <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Prediction result
            </p>

            {!result ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl text-cyan-300">
                  ↗
                </div>
                <h2 className="text-xl font-semibold">Awaiting analysis</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-400">
                  Submit the customer details to see the model&apos;s prediction
                  and estimated churn probability.
                </p>
              </div>
            ) : (
              <div className="mt-8">
                <div
                  className={`rounded-xl border p-5 ${
                    result.churn
                      ? "border-red-900 bg-red-950/30"
                      : "border-emerald-900 bg-emerald-950/30"
                  }`}
                >
                  <p className="text-sm text-slate-400">Model prediction</p>
                  <h2
                    className={`mt-2 text-2xl font-bold ${
                      result.churn ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {result.churn ? "Churn predicted" : "Churn not predicted"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Predicted class: {result.prediction}
                  </p>
                </div>

                <div className="mt-8">
                  <div className="flex items-end justify-between">
                    <p className="text-sm text-slate-400">Churn probability</p>
                    <p className="text-3xl font-bold">{probability}%</p>
                  </div>
                  <div
                    className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"
                    role="progressbar"
                    aria-label="Churn probability"
                    aria-valuenow={probability}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.churn ? "bg-red-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${probability}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    This is the model&apos;s estimated probability, not a
                    guarantee that the customer will leave.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCustomer(initialCustomer);
                    setResult(null);
                    setError("");
                  }}
                  className="mt-8 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold transition hover:bg-slate-800"
                >
                  Reset form
                </button>
              </div>
            )}

            <div className="mt-8 border-t border-slate-800 pt-5">
              <p className="text-xs text-slate-500">
                Model: Logistic Regression · Backend: FastAPI · Frontend:
                Next.js
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-600">
          Educational ML project · Predictions depend on the training data and
          model quality.
        </footer>
      </div>
    </main>
  );

}