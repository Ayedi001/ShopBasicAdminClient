"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { ApiError, errorMessage, resolveFieldErrors } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { tFr } from "./labels";

type Toast = { id: number; kind: "ok" | "error"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => undefined);

export function AdminToaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex animate-slideUp items-start gap-2 rounded-lg px-3.5 py-3 text-[13px] shadow-lg",
              t.kind === "ok" ? "bg-neutral-900 text-white" : "bg-red-600 text-white",
            )}
          >
            {t.kind === "ok" ? <CheckCircle2 className="mt-px h-4 w-4 shrink-0" /> : <XCircle className="mt-px h-4 w-4 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/**
 * Runs an API call with busy state, field errors, toast feedback and an
 * optional router refresh so server components re-render with fresh data.
 */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts: { success?: string; refresh?: boolean; onDone?: (r: T) => void } = {}): Promise<T | undefined> => {
      setBusy(true);
      setErrors({});
      try {
        const r = await fn();
        if (opts.success) toast("ok", opts.success);
        if (opts.refresh !== false) router.refresh();
        opts.onDone?.(r);
        return r;
      } catch (e) {
        if (e instanceof ApiError && e.fields) setErrors(resolveFieldErrors(e.fields, tFr));
        toast("error", errorMessage(e, tFr));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );
  return { run, busy, errors, setErrors };
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()} dir="ltr">
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("w-full animate-slideUp rounded-xl bg-white shadow-2xl", w)}>
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-neutral-100 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Button that asks for confirmation before running a destructive API call. */
export function ConfirmButton({
  action,
  label,
  confirm,
  success,
  className = "a-btn a-btn-sm",
  children,
  onDone,
  danger = true,
}: {
  action: () => Promise<unknown>;
  label: string;
  confirm: string;
  success?: string;
  className?: string;
  children?: React.ReactNode;
  onDone?: () => void;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} title={label}>
        {children ?? label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        size="sm"
        footer={
          <>
            <button type="button" className="a-btn" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className={danger ? "a-btn-danger" : "a-btn-primary"}
              disabled={busy}
              onClick={() =>
                run(action, {
                  success,
                  onDone: () => {
                    setOpen(false);
                    onDone?.();
                  },
                })
              }
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
            </button>
          </>
        }
      >
        <p className="text-[14px] text-neutral-700">{confirm}</p>
      </Modal>
    </>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="a-label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-neutral-500">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: React.ReactNode; wrapClass?: string };
export function TextInput({ label, error, hint, wrapClass, className, ...rest }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapClass}>
      <input {...rest} className={cn("a-input", error && "a-input-error", className)} />
    </Field>
  );
}

export function TextArea({ label, error, hint, wrapClass, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: React.ReactNode; wrapClass?: string }) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapClass}>
      <textarea {...rest} className={cn("a-input min-h-[80px]", error && "a-input-error", className)} />
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  options,
  wrapClass,
  className,
  placeholder,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: React.ReactNode; options: { value: string; label: string }[]; wrapClass?: string; placeholder?: string }) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapClass}>
      <select {...rest} className={cn("a-input", error && "a-input-error", className)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-[13px]", disabled && "cursor-not-allowed opacity-60")}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-neutral-900" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium text-neutral-800">{label}</span>
        {hint && <span className="block text-[12px] text-neutral-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Amount in dinars edited as text, stored by the caller in millimes. */
export function MoneyInput({ label, value, onChange, error, hint, allowEmpty, wrapClass }: { label: string; value: number | null; onChange: (millimes: number | null) => void; error?: string; hint?: React.ReactNode; allowEmpty?: boolean; wrapClass?: string }) {
  const [text, setText] = useState(value == null ? "" : String(value / 1000));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setText(value == null ? "" : String(value / 1000));
      last.current = value;
    }
  }, [value]);
  return (
    <Field label={label} error={error} hint={hint} className={wrapClass}>
      <div className="relative">
        <input
          inputMode="decimal"
          className={cn("a-input pr-10", error && "a-input-error")}
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            if (!/^\d*\.?\d{0,3}$/.test(raw)) return;
            setText(raw);
            const v = raw === "" ? (allowEmpty ? null : 0) : Math.round(Number(raw) * 1000);
            last.current = v;
            onChange(v);
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[12px] text-neutral-400">DT</span>
      </div>
    </Field>
  );
}

/** ISO string <-> value for <input type="datetime-local"> in the browser's timezone. */
export function toLocalInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
}
export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : "";
}
