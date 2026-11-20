"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useStore } from "./store-provider";
import { FormAlert } from "./form-field";
import { post, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; detail: string; quantity: number; sizes: string[] };
const REASONS = ["WRONG_SIZE", "DEFECTIVE", "NOT_AS_DESCRIBED", "WRONG_ITEM", "CHANGED_MIND", "OTHER"];

export function ReturnRequestForm({ orderNumber, items, canReturn, canExchange }: { orderNumber: string; items: Item[]; canReturn: boolean; canExchange: boolean }) {
  const { t, toast } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"EXCHANGE" | "RETURN">(canExchange ? "EXCHANGE" : "RETURN");
  const [reason, setReason] = useState("WRONG_SIZE");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Record<string, { quantity: number; size: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!items.length) return null;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        <RefreshCw className="h-4 w-4" /> {t("account.requestReturn")}
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = Object.entries(selected);
    if (!chosen.length) {
      setError(t("err.selectItem"));
      return;
    }
    if (type === "EXCHANGE" && chosen.some(([, v]) => !v.size)) {
      setError(`${t("account.requestedSize")} : ${t("err.required")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post("/api/returns", {
        orderNumber,
        type,
        reason,
        description: description || null,
        items: chosen.map(([orderItemId, v]) => ({ orderItemId, quantity: v.quantity, requestedSize: type === "EXCHANGE" ? v.size : null })),
      });
      toast(t("account.requestSent"));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 border border-neutral-200 p-5">
      <h3 className="text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.requestReturn")}</h3>
      <FormAlert message={error} />
      <fieldset>
        <legend className="label">{t("account.returnType")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["EXCHANGE", "RETURN"] as const).map((v) => {
            const allowed = v === "EXCHANGE" ? canExchange : canReturn;
            return (
              <label key={v} className={cn("chip cursor-pointer", type === v && "border-brand bg-brand text-white", !allowed && "cursor-not-allowed opacity-40")}>
                <input type="radio" className="sr-only" name="type" checked={type === v} disabled={!allowed} onChange={() => setType(v)} />
                {t(`account.returnTypes.${v}`)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{t("account.selectItems")}</legend>
        <ul className="space-y-3">
          {items.map((i) => {
            const sel = selected[i.id];
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-3 text-[14px]">
                <label className="flex flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!sel}
                    onChange={(e) =>
                      setSelected((s) => {
                        const n = { ...s };
                        if (e.target.checked) n[i.id] = { quantity: 1, size: "" };
                        else delete n[i.id];
                        return n;
                      })
                    }
                    className="h-4 w-4 accent-[rgb(var(--brand))]"
                  />
                  <span>
                    {i.name} <span className="text-ink-muted">({i.detail})</span>
                  </span>
                </label>
                {sel && i.quantity > 1 && (
                  <select value={sel.quantity} onChange={(e) => setSelected((s) => ({ ...s, [i.id]: { ...sel, quantity: Number(e.target.value) } }))} className="input w-20 py-1.5">
                    {Array.from({ length: i.quantity }, (_, k) => k + 1).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                )}
                {sel && type === "EXCHANGE" && (
                  <select value={sel.size} onChange={(e) => setSelected((s) => ({ ...s, [i.id]: { ...sel, size: e.target.value } }))} className="input w-40 py-1.5" aria-label={t("account.requestedSize")}>
                    <option value="">{t("account.requestedSize")}</option>
                    {i.sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div>
        <label htmlFor="reason" className="label">
          {t("account.reason")}
        </label>
        <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input">
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`returnReason.${r}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="desc" className="label">
          {t("account.describe")}
        </label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} className="input" />
      </div>
      <div className="flex gap-3">
        <button className="btn-primary" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("account.submitRequest")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
