"use client";

import { useState } from "react";
import Link from "next/link";
import { History, SlidersHorizontal } from "lucide-react";
import { post } from "@/lib/client-api";
import { MANUAL_STOCK_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { STOCK_TYPE_LABELS } from "./labels";
import { Modal, Select, Spinner, TextInput, useAction, useToast } from "./ui";

type Row = {
  id: string;
  productId: string;
  productName: string;
  productStatus: string;
  color: { name: string; hex: string } | null;
  size: string | null;
  sku: string | null;
  stock: number;
  reserved: number;
  available: number;
  isActive: boolean;
};

export function InventoryTable({ rows, threshold }: { rows: Row[]; threshold: number }) {
  const [adjust, setAdjust] = useState<Row | null>(null);
  const [bulk, setBulk] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [bulkReason, setBulkReason] = useState("");
  const [bulkType, setBulkType] = useState<string>("CORRECTION");
  const { run, busy, errors } = useAction();
  const toast = useToast();
  const changed = Object.entries(edits).filter(([id, v]) => rows.find((r) => r.id === id)?.stock !== v);

  const saveBulk = () =>
    run(() => post<{ updated: number; errors: { variantId: string; message: string }[] }>("/api/admin/inventory/bulk", { reason: bulkReason, type: bulkType, items: changed.map(([variantId, stock]) => ({ variantId, stock })) }), {
      onDone: (r) => {
        if (r.errors.length) toast("error", `${r.updated} mise(s) à jour, ${r.errors.length} refusée(s) : ${r.errors[0].message}`);
        else toast("ok", `${r.updated} variante(s) mise(s) à jour`);
        setEdits({});
        setBulk(false);
        setBulkReason("");
      },
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
        <p className="text-[12px] text-neutral-500">Disponible = stock physique − unités réservées par les commandes en attente de confirmation.</p>
        {bulk ? (
          <div className="flex flex-wrap items-center gap-2">
            <select className="a-input w-auto py-1 text-[12px]" value={bulkType} onChange={(e) => setBulkType(e.target.value)} aria-label="Type">
              {MANUAL_STOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {STOCK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <input className={cn("a-input w-56 py-1 text-[12px]", errors.reason && "a-input-error")} placeholder="Motif (obligatoire)" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} maxLength={300} />
            <button type="button" className="a-btn-primary a-btn-sm" disabled={busy || !changed.length || !bulkReason.trim()} onClick={saveBulk}>
              {busy && <Spinner />} Enregistrer {changed.length} modification(s)
            </button>
            <button
              type="button"
              className="a-btn a-btn-sm"
              onClick={() => {
                setBulk(false);
                setEdits({});
              }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button type="button" className="a-btn a-btn-sm" onClick={() => setBulk(true)}>
            Modification en masse
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="a-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Variante</th>
              <th>SKU</th>
              <th className="text-right">Stock physique</th>
              <th className="text-right">Réservé</th>
              <th className="text-right">Disponible</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn(!r.isActive && "opacity-60")}>
                <td>
                  <Link href={`/admin/products/${r.productId}?tab=variants`} className="font-medium hover:underline">
                    {r.productName}
                  </Link>
                  {r.productStatus !== "PUBLISHED" && <span className="ml-1 text-[11px] text-neutral-500">(non publié)</span>}
                  {!r.isActive && <span className="ml-1 text-[11px] text-neutral-500">(variante inactive)</span>}
                </td>
                <td>
                  <span className="flex items-center gap-1.5">
                    {r.color && <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ background: r.color.hex }} />}
                    {[r.color?.name, r.size].filter(Boolean).join(" · ") || "Unique"}
                  </span>
                </td>
                <td className="text-[12px] text-neutral-500">{r.sku ?? "—"}</td>
                <td className="text-right tabular-nums">
                  {bulk ? (
                    <input
                      type="number"
                      min={r.reserved}
                      className={cn("a-input ml-auto w-20 py-1 text-right", edits[r.id] !== undefined && edits[r.id] !== r.stock && "border-amber-500 bg-amber-50")}
                      value={edits[r.id] ?? r.stock}
                      onChange={(e) => setEdits((x) => ({ ...x, [r.id]: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
                      aria-label={`Stock ${r.productName}`}
                    />
                  ) : (
                    r.stock
                  )}
                </td>
                <td className="text-right tabular-nums text-neutral-500">{r.reserved}</td>
                <td className={cn("text-right font-semibold tabular-nums", r.available <= 0 ? "text-red-600" : r.available <= threshold ? "text-amber-600" : "")}>{r.available}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button type="button" className="a-btn a-btn-sm" onClick={() => setAdjust(r)} title="Ajuster le stock">
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Ajuster
                    </button>
                    <Link href={`/admin/inventory?tab=movements&variant=${r.id}`} className="a-btn a-btn-sm" title="Historique">
                      <History className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adjust && <AdjustModal row={adjust} onClose={() => setAdjust(null)} />}
    </>
  );
}

function AdjustModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [mode, setMode] = useState<"DELTA" | "SET">("DELTA");
  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState<string>("RESTOCK");
  const [reason, setReason] = useState("");
  const { run, busy, errors } = useAction();
  const after = mode === "SET" ? quantity : row.stock + quantity;
  const invalid = after < row.reserved || after < 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ajuster le stock — ${row.productName}`}
      size="sm"
      footer={
        <>
          <button type="button" className="a-btn" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="a-btn-primary"
            disabled={busy || invalid || !reason.trim() || (mode === "DELTA" && quantity === 0)}
            onClick={() => run(() => post("/api/admin/inventory/adjust", { variantId: row.id, mode, quantity, type, reason }), { success: "Stock mis à jour", onDone: onClose })}
          >
            {busy && <Spinner />} Valider
          </button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-neutral-600">
        {[row.color?.name, row.size].filter(Boolean).join(" · ") || "Variante unique"} — stock actuel <strong>{row.stock}</strong>, réservé <strong>{row.reserved}</strong>, disponible <strong>{row.available}</strong>.
      </p>
      <div className="mb-3 flex rounded-md border border-neutral-200 p-0.5 text-[13px]">
        {(
          [
            ["DELTA", "Ajouter / retirer"],
            ["SET", "Définir le stock"],
          ] as const
        ).map(([m, l]) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex-1 rounded px-2 py-1", mode === m ? "bg-neutral-900 text-white" : "text-neutral-600")}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label={mode === "DELTA" ? "Quantité (+ ou −)" : "Nouveau stock"}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.round(Number(e.target.value) || 0))}
          error={errors.quantity}
        />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={MANUAL_STOCK_TYPES.map((t) => ({ value: t, label: STOCK_TYPE_LABELS[t] }))} />
      </div>
      <TextInput wrapClass="mt-3" label="Motif *" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} placeholder="Ex. : réception fournisseur, article taché…" maxLength={300} />
      <p className={cn("mt-3 text-[13px]", invalid ? "text-red-600" : "text-neutral-600")}>
        Stock après opération : <strong>{after}</strong>
        {invalid && ` — impossible : ${row.reserved} unité(s) sont réservées par des commandes en attente.`}
      </p>
    </Modal>
  );
}
