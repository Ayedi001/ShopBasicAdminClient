"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; name: string };

export function Field({ label, error, hint, className, name, id, ...rest }: FieldProps) {
  const fid = id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">
        {label}
      </label>
      <input id={fid} name={name} className={cn("input", error && "input-error")} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} {...rest} />
      {error ? (
        <p id={`${fid}-err`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordField(props: FieldProps & { showLabel: string }) {
  const [show, setShow] = useState(false);
  const { showLabel, label, error, hint, className, name, ...rest } = props;
  const fid = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">
        {label}
      </label>
      <div className="relative">
        <input id={fid} name={name} type={show ? "text" : "password"} className={cn("input pe-11", error && "input-error")} aria-invalid={!!error} {...rest} />
        <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-ink-muted" aria-label={showLabel}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : hint ? <p className="mt-1 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, error, name, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; name: string }) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="label">
        {label}
      </label>
      <textarea id={`f-${name}`} name={name} className={cn("input", error && "input-error")} aria-invalid={!!error} {...rest} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function FormAlert({ message, tone = "error" }: { message: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <div role="alert" className={cn("px-4 py-3 text-[14px]", tone === "error" ? "bg-red-50 text-sale" : "bg-emerald-50 text-emerald-800")}>
      {message}
    </div>
  );
}
