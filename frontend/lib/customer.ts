// Shared types, form configuration and helpers for the churn predictor.
// Category lists mirror exactly what the model was trained on (the API rejects anything else).

/** Shape the API expects. */
export type Customer = {
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

export type PredictionResult = {
  prediction: number;
  churn: boolean;
  churn_probability: number;
};

export type ModelInfo = {
  source: "registry" | "local";
  name: string;
  version: string | null;
  run_id: string | null;
  uri: string;
};

export type FieldKey = keyof Customer;
/** Every form value is kept as a string so inputs can be edited freely; converted by toPayload(). */
export type FormValues = Record<FieldKey, string>;
export type NumericKey = "tenure" | "MonthlyCharges" | "TotalCharges";

export type ChoiceField = { key: FieldKey; label: string; options: string[] };
export type NumberField = {
  key: NumericKey;
  label: string;
  prefix?: string;
  suffix?: string;
  min: number;
  max: number;
  step: number;
};

const YES_NO = ["Yes", "No"];
const ADD_ON = ["Yes", "No", "No internet service"];

export const ADD_ON_KEYS: FieldKey[] = [
  "OnlineSecurity",
  "OnlineBackup",
  "DeviceProtection",
  "TechSupport",
  "StreamingTV",
  "StreamingMovies",
];

export const PROFILE_CHOICES: ChoiceField[] = [
  { key: "gender", label: "Gender", options: ["Female", "Male"] },
  { key: "SeniorCitizen", label: "Senior citizen", options: YES_NO },
  { key: "Partner", label: "Has a partner", options: YES_NO },
  { key: "Dependents", label: "Has dependents", options: YES_NO },
];

export const TENURE_FIELD: NumberField = {
  key: "tenure",
  label: "Tenure",
  suffix: "months",
  min: 0,
  max: 120,
  step: 1,
};

export const SERVICE_CHOICES: ChoiceField[] = [
  { key: "PhoneService", label: "Phone service", options: YES_NO },
  { key: "MultipleLines", label: "Multiple lines", options: ["Yes", "No", "No phone service"] },
  { key: "InternetService", label: "Internet service", options: ["DSL", "Fiber optic", "No"] },
  { key: "OnlineSecurity", label: "Online security", options: ADD_ON },
  { key: "OnlineBackup", label: "Online backup", options: ADD_ON },
  { key: "DeviceProtection", label: "Device protection", options: ADD_ON },
  { key: "TechSupport", label: "Tech support", options: ADD_ON },
  { key: "StreamingTV", label: "Streaming TV", options: ADD_ON },
  { key: "StreamingMovies", label: "Streaming movies", options: ADD_ON },
];

export const BILLING_CHOICES: ChoiceField[] = [
  { key: "Contract", label: "Contract", options: ["Month-to-month", "One year", "Two year"] },
  { key: "PaperlessBilling", label: "Paperless billing", options: YES_NO },
  {
    key: "PaymentMethod",
    label: "Payment method",
    options: [
      "Electronic check",
      "Mailed check",
      "Bank transfer (automatic)",
      "Credit card (automatic)",
    ],
  },
];

export const MONTHLY_FIELD: NumberField = {
  key: "MonthlyCharges",
  label: "Monthly charges",
  prefix: "$",
  min: 0,
  max: 100000,
  step: 0.01,
};

export const TOTAL_FIELD: NumberField = {
  key: "TotalCharges",
  label: "Total charges",
  prefix: "$",
  min: 0,
  max: 100000,
  step: 0.01,
};

export const initialValues: FormValues = {
  gender: "Female",
  SeniorCitizen: "No",
  Partner: "Yes",
  Dependents: "No",
  tenure: "12",
  PhoneService: "Yes",
  MultipleLines: "No",
  InternetService: "DSL",
  OnlineSecurity: "No",
  OnlineBackup: "No",
  DeviceProtection: "No",
  TechSupport: "No",
  StreamingTV: "No",
  StreamingMovies: "No",
  Contract: "Month-to-month",
  PaperlessBilling: "Yes",
  PaymentMethod: "Electronic check",
  MonthlyCharges: "70",
  TotalCharges: "840",
};

export const presets: { id: string; label: string; description: string; values: FormValues }[] = [
  {
    id: "new-fiber",
    label: "New fiber customer",
    description: "2 months, month-to-month, fiber",
    values: {
      ...initialValues,
      gender: "Male",
      Partner: "No",
      tenure: "2",
      InternetService: "Fiber optic",
      Contract: "Month-to-month",
      PaymentMethod: "Electronic check",
      MonthlyCharges: "85",
      TotalCharges: "170",
    },
  },
  {
    id: "mid-term",
    label: "Mid-term customer",
    description: "2 years, one-year contract, DSL",
    values: {
      ...initialValues,
      tenure: "24",
      Contract: "One year",
      PaymentMethod: "Mailed check",
      PaperlessBilling: "No",
      MonthlyCharges: "55",
      TotalCharges: "1320",
    },
  },
  {
    id: "loyal",
    label: "Loyal long-term customer",
    description: "5 years, two-year contract, add-ons",
    values: {
      ...initialValues,
      Partner: "Yes",
      Dependents: "Yes",
      tenure: "60",
      OnlineSecurity: "Yes",
      OnlineBackup: "Yes",
      DeviceProtection: "Yes",
      TechSupport: "Yes",
      Contract: "Two year",
      PaperlessBilling: "No",
      PaymentMethod: "Credit card (automatic)",
      MonthlyCharges: "75",
      TotalCharges: "4500",
    },
  },
];

/** Options currently valid for a field (some depend on phone/internet service). */
export function optionsFor(field: ChoiceField, values: FormValues): string[] {
  if (field.key === "MultipleLines") {
    return values.PhoneService === "No" ? ["No phone service"] : ["Yes", "No"];
  }
  if (ADD_ON_KEYS.includes(field.key)) {
    return values.InternetService === "No" ? ["No internet service"] : ["Yes", "No"];
  }
  return field.options;
}

/** Keep dependent fields consistent, the way real Telco records are. */
export function normalize(values: FormValues): FormValues {
  const next = { ...values };

  if (next.PhoneService === "No") next.MultipleLines = "No phone service";
  else if (next.MultipleLines === "No phone service") next.MultipleLines = "No";

  for (const key of ADD_ON_KEYS) {
    if (next.InternetService === "No") next[key] = "No internet service";
    else if (next[key] === "No internet service") next[key] = "No";
  }
  return next;
}

export function toPayload(values: FormValues): Customer {
  return {
    ...values,
    SeniorCitizen: values.SeniorCitizen === "Yes" ? 1 : 0,
    tenure: Number(values.tenure),
    MonthlyCharges: Number(values.MonthlyCharges),
    TotalCharges: Number(values.TotalCharges),
  };
}

export function estimateTotalCharges(values: FormValues): string {
  const total = Number(values.tenure) * Number(values.MonthlyCharges);
  return Number.isFinite(total) ? String(Math.round(total * 100) / 100) : "";
}

export type RiskTone = "low" | "elevated" | "high";
export type RiskLevel = { tone: RiskTone; label: string; summary: string };

/** Bands line up with the model's 0.5 decision threshold: "High risk" == churn predicted. */
export function riskLevel(probability: number): RiskLevel {
  if (probability >= 0.5) {
    return {
      tone: "high",
      label: "High risk",
      summary: "Strong churn signals. A retention offer or outreach could help.",
    };
  }
  if (probability >= 0.3) {
    return {
      tone: "elevated",
      label: "Elevated risk",
      summary: "Some churn signals. Worth keeping an eye on this customer.",
    };
  }
  return {
    tone: "low",
    label: "Low risk",
    summary: "This customer looks likely to stay.",
  };
}

export function modelLabel(info: ModelInfo | null, serverReady: boolean | null): string {
  if (info) {
    const version = info.version ? ` v${info.version}` : "";
    return `${info.name}${version}${info.source === "local" ? " (local file)" : ""}`;
  }
  return serverReady === false ? "unavailable" : "loading...";
}

/** Turn an API error response into a short, readable message. */
export function describeApiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (Array.isArray(parsed.detail)) {
      const lines = parsed.detail.map((item: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(item.loc) ? String(item.loc[item.loc.length - 1]) : "input";
        return `${field}: ${item.msg ?? "invalid value"}`;
      });
      return `The server rejected some values. ${lines.join("; ")}`;
    }
    if (typeof parsed.detail === "string") return `Server error (${status}): ${parsed.detail}`;
  } catch {
    // not JSON, fall through
  }
  return `Server error (${status}). Please try again.`;
}
