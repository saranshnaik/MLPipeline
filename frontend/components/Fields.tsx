import type { ReactNode } from "react";

import type { ChoiceField, NumberField } from "@/lib/customer";

const labelClass = "mb-2 block text-sm font-medium text-slate-300";
const controlClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-slate-100 " +
  "outline-none transition placeholder:text-slate-500 hover:border-slate-600 " +
  "focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

type ChoiceProps = {
  field: ChoiceField;
  value: string;
  options: string[];
  onChange: (key: ChoiceField["key"], value: string) => void;
};

/** Two options -> segmented toggle (real radios, so keyboard + screen readers just work). Otherwise a select. */
export function ChoiceInput({ field, value, options, onChange }: ChoiceProps) {
  const locked = options.length === 1;

  if (options.length === 2) {
    return (
      <fieldset>
        <legend className={labelClass}>{field.label}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-950/80 p-1">
          {options.map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name={field.key}
                value={option}
                checked={value === option}
                onChange={() => onChange(field.key, option)}
                className="peer sr-only"
              />
              <span
                className="block rounded-md px-3 py-1.5 text-center text-sm text-slate-400 transition
                  hover:text-slate-200 peer-checked:bg-cyan-400 peer-checked:font-semibold
                  peer-checked:text-slate-950 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300"
              >
                {option}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const id = `field-${field.key}`;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {field.label}
      </label>
      <select
        id={id}
        value={value}
        disabled={locked}
        onChange={(event) => onChange(field.key, event.target.value)}
        className={`${controlClass} scheme-dark`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

type NumberProps = {
  field: NumberField;
  value: string;
  onChange: (key: NumberField["key"], value: string) => void;
  hint?: string;
  action?: ReactNode;
};

export function NumberInput({ field, value, onChange, hint, action }: NumberProps) {
  const id = `field-${field.key}`;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-300">
          {field.label}
        </label>
        {action}
      </div>
      <div className="relative">
        {field.prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {field.prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          required
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={`${controlClass} ${field.prefix ? "pl-7" : ""} ${field.suffix ? "pr-16" : ""}`}
        />
        {field.suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
            {field.suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
