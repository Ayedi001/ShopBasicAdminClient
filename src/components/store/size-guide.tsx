"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useStore } from "./store-provider";

export type SizeChartData = { name: string; description: string | null; unit: string; columns: string[]; rows: { size: string; values: string[] }[] };

export function SizeChartTable({ chart, highlight }: { chart: SizeChartData; highlight?: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[14px]">
        <thead>
          <tr className="bg-neutral-50">
            <th className="border border-neutral-200 px-3 py-2.5 text-start font-medium">Taille</th>
            {chart.columns.map((c) => (
              <th key={c} className="border border-neutral-200 px-3 py-2.5 text-start font-medium">
                {c} <span className="font-normal text-ink-muted">({chart.unit})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((r) => (
            <tr key={r.size} className={highlight === r.size ? "bg-brand-soft" : ""}>
              <td className="border border-neutral-200 px-3 py-2.5 font-medium">{r.size}</td>
              {r.values.map((v, i) => (
                <td key={i} className="border border-neutral-200 px-3 py-2.5 tabular-nums">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SizeGuideModal({ chart, open, onClose, highlight }: { chart: SizeChartData; open: boolean; onClose: () => void; highlight?: string | null }) {
  const { t } = useStore();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t("product.sizeGuide")}>
      <div className="absolute inset-0 animate-fadeIn bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl animate-slideUp overflow-y-auto bg-white p-6 sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="h-display text-2xl">{t("product.sizeGuide")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{chart.name}</p>
          </div>
          <button onClick={onClose} className="-me-2 p-2" aria-label={t("common.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <SizeChartTable chart={chart} highlight={highlight} />
        {chart.description && <p className="mt-4 text-sm text-ink-muted">{chart.description}</p>}
        <p className="mt-4 text-sm text-ink-muted">{t("pages.sizeGuideIntro")}</p>
      </div>
    </div>
  );
}
