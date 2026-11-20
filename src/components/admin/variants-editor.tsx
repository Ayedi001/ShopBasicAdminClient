"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { put } from "@/lib/client-api";
import { SIZE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { SIZE_TYPE_LABELS } from "./labels";
import { Spinner, useAction, useToast } from "./ui";

type Color = { id: string; name: string; hex: string };
type Size = { id: string; label: string; type: string };
export type VariantDraft = {
  id?: string;
  colorId: string | null;
  sizeId: string | null;
  sku: string;
  price: number | null;
  salePrice: number | null;
  stock: number;
  reserved?: number;
  available?: number;
  isActive: boolean;
};

const key = (v: { colorId: string | null; sizeId: string | null }) => `${v.colorId ?? "-"}:${v.sizeId ?? "-"}`;
const dtInput = (m: number | null) => (m == null ? "" : String(m / 1000));
const parseDt = (s: string) => {
  const t = s.replace(",", ".").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) : null;
};

export function VariantsEditor({
  productId,
  basePrice,
  baseSalePrice,
  colors,
  sizes,
  defaultSizeType,
  initial,
  canAdjustStock,
}: {
  productId: string;
  basePrice: number;
  baseSalePrice: number | null;
  colors: Color[];
  sizes: Size[];
  defaultSizeType: string;
  initial: VariantDraft[];
  canAdjustStock: boolean;
}) {
  const [rows, setRows] = useState<VariantDraft[]>(initial);
  const [pickColors, setPickColors] = useState<string[]>(() => [...new Set(initial.map((v) => v.colorId).filter(Boolean) as string[])]);
  const [pickSizes, setPickSizes] = useState<string[]>(() => [...new Set(initial.map((v) => v.sizeId).filter(Boolean) as string[])]);
  const [sizeType, setSizeType] = useState(defaultSizeType);
  const [defaultStock, setDefaultStock] = useState(0);
  const [dirty, setDirty] = useState(false);
  const { run, busy } = useAction();
  const toast = useToast();

  const colorById = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const sizeById = useMemo(() => new Map(sizes.map((s) => [s.id, s])), [sizes]);
  const sizeOptions = sizes.filter((s) => s.type === sizeType);
  const update = (i: number, patch: Partial<VariantDraft>) => {
    setRows((r) => r.map((v, j) => (j === i ? { ...v, ...patch } : v)));
    setDirty(true);
  };

  const generate = () => {
    const cs = pickColors.length ? pickColors : [null];
    const ss = pickSizes.length ? pickSizes : [null];
    const existing = new Set(rows.map(key));
    const added: VariantDraft[] = [];
    for (const c of cs)
      for (const s of ss) {
        const v = { colorId: c, sizeId: s };
        if (!existing.has(key(v))) added.push({ ...v, sku: "", price: null, salePrice: null, stock: defaultStock, isActive: true });
      }
    if (!added.length) {
      toast("error", "Toutes ces combinaisons existent déjà.");
      return;
    }
    // Keep a readable order: by colour then by size order
    const sizeRank = new Map(sizes.map((s, i) => [s.id, i]));
    const colorRank = new Map(colors.map((c, i) => [c.id, i]));
    setRows((r) =>
      [...r, ...added].sort(
        (a, b) => (colorRank.get(a.colorId ?? "") ?? -1) - (colorRank.get(b.colorId ?? "") ?? -1) || (sizeRank.get(a.sizeId ?? "") ?? -1) - (sizeRank.get(b.sizeId ?? "") ?? -1),
      ),
    );
    setDirty(true);
    toast("ok", `${added.length} variante(s) ajoutée(s) — pensez à enregistrer`);
  };

  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) seen.set(key(r), (seen.get(key(r)) ?? 0) + 1);
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);

  const save = () =>
    run(
      () =>
        put<{ variants: (Omit<VariantDraft, "sku"> & { id: string; sku: string | null })[] }>(`/api/admin/products/${productId}/variants`, {
          variants: rows.map((r) => ({ id: r.id ?? null, colorId: r.colorId, sizeId: r.sizeId, sku: r.sku || null, price: r.price, salePrice: r.salePrice, stock: r.id ? 0 : r.stock, isActive: r.isActive })),
        }),
      {
        success: "Variantes enregistrées",
        onDone: (r) => {
          setRows(r.variants.map((v) => ({ id: v.id, colorId: v.colorId, sizeId: v.sizeId, sku: v.sku ?? "", price: v.price, salePrice: v.salePrice, stock: v.stock, reserved: v.reserved, available: v.available, isActive: v.isActive })));
          setDirty(false);
        },
      },
    );

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="space-y-4">
      <section className="a-card p-4">
        <h2 className="text-[14px] font-semibold">Générer des variantes</h2>
        <p className="mt-1 text-[12px] text-neutral-500">Sélectionnez les couleurs et tailles : chaque combinaison devient une variante avec son propre stock. Sans couleur ou sans taille, une variante unique est créée.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="a-label">Couleurs</p>
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPickColors((l) => toggle(l, c.id))}
                  className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", pickColors.includes(c.id) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:border-neutral-500")}
                >
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
              <Link href="/admin/attributes" className="rounded-full border border-dashed border-neutral-300 px-2.5 py-1 text-[12px] text-neutral-500 hover:border-neutral-500">
                + Gérer les couleurs
              </Link>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="a-label mb-0">Tailles</p>
              <select className="a-input w-auto py-1 text-[12px]" value={sizeType} onChange={(e) => setSizeType(e.target.value)}>
                {SIZE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SIZE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sizeOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPickSizes((l) => toggle(l, s.id))}
                  className={cn("min-w-[2.5rem] rounded-md border px-2 py-1 text-[12px]", pickSizes.includes(s.id) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:border-neutral-500")}
                >
                  {s.label}
                </button>
              ))}
              {!sizeOptions.length && <span className="text-[12px] text-neutral-500">Aucune taille de ce type.</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label>
            <span className="a-label">Stock initial par nouvelle variante</span>
            <input type="number" min={0} className="a-input w-32" value={defaultStock} onChange={(e) => setDefaultStock(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
          </label>
          <button type="button" className="a-btn" onClick={generate}>
            <Wand2 className="h-4 w-4" /> Générer {Math.max(1, pickColors.length) * Math.max(1, pickSizes.length)} combinaison(s)
          </button>
          <button
            type="button"
            className="a-btn-ghost"
            onClick={() => {
              setRows((r) => [...r, { colorId: null, sizeId: null, sku: "", price: null, salePrice: null, stock: 0, isActive: true }]);
              setDirty(true);
            }}
          >
            <Plus className="h-4 w-4" /> Ligne vide
          </button>
        </div>
      </section>

      <section className="a-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold">Variantes ({rows.length})</h2>
            <p className="text-[12px] text-neutral-500">
              Prix vide = prix du produit ({formatMoney(baseSalePrice ?? basePrice)}). Le stock des variantes existantes se modifie via{" "}
              {canAdjustStock ? (
                <Link href="/admin/inventory" className="underline">
                  le module Stock
                </Link>
              ) : (
                "le module Stock"
              )}{" "}
              (avec historique).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <span className="text-[12px] text-amber-700">Modifications non enregistrées</span>}
            <button type="button" className="a-btn-primary" onClick={save} disabled={busy || duplicates.size > 0}>
              {busy && <Spinner />} Enregistrer les variantes
            </button>
          </div>
        </header>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Couleur</th>
                  <th>Taille</th>
                  <th>SKU</th>
                  <th>Prix (DT)</th>
                  <th>Prix promo (DT)</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Réservé</th>
                  <th className="text-right">Disponible</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((v, i) => {
                  const isNew = !v.id;
                  const dup = duplicates.has(key(v));
                  return (
                    <tr key={v.id ?? `new-${i}`} className={cn(!v.isActive && "opacity-60", dup && "bg-red-50")}>
                      <td>
                        {isNew ? (
                          <select className="a-input w-36 py-1" value={v.colorId ?? ""} onChange={(e) => update(i, { colorId: e.target.value || null })}>
                            <option value="">Sans couleur</option>
                            {colors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            {v.colorId && <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ background: colorById.get(v.colorId)?.hex }} />}
                            {v.colorId ? colorById.get(v.colorId)?.name : "—"}
                          </span>
                        )}
                      </td>
                      <td>
                        {isNew ? (
                          <select className="a-input w-28 py-1" value={v.sizeId ?? ""} onChange={(e) => update(i, { sizeId: e.target.value || null })}>
                            <option value="">Sans taille</option>
                            {sizes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label} ({SIZE_TYPE_LABELS[s.type]?.split(" ")[0]})
                              </option>
                            ))}
                          </select>
                        ) : v.sizeId ? (
                          sizeById.get(v.sizeId)?.label
                        ) : (
                          "—"
                        )}
                        {dup && <span className="block text-[11px] text-red-600">Combinaison en double</span>}
                      </td>
                      <td>
                        <input className="a-input w-32 py-1" value={v.sku} maxLength={60} onChange={(e) => update(i, { sku: e.target.value })} placeholder="Auto" />
                      </td>
                      <td>
                        <PriceCell value={v.price} placeholder={dtInput(basePrice)} onChange={(p) => update(i, { price: p })} />
                      </td>
                      <td>
                        <PriceCell value={v.salePrice} placeholder="—" onChange={(p) => update(i, { salePrice: p })} />
                      </td>
                      <td className="text-right">
                        {isNew ? (
                          <input type="number" min={0} className="a-input ml-auto w-20 py-1 text-right" value={v.stock} onChange={(e) => update(i, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                        ) : (
                          <span className="tabular-nums">{v.stock}</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums text-neutral-500">{v.reserved ?? 0}</td>
                      <td className={cn("text-right font-medium tabular-nums", !isNew && (v.available ?? 0) <= 0 && "text-red-600")}>{isNew ? v.stock : v.available}</td>
                      <td>
                        <input type="checkbox" className="h-4 w-4 accent-neutral-900" checked={v.isActive} onChange={(e) => update(i, { isActive: e.target.checked })} aria-label="Variante active" />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="a-btn a-btn-sm text-red-600"
                          title={isNew ? "Retirer" : "Supprimer (désactivée si déjà commandée)"}
                          onClick={() => {
                            setRows((r) => r.filter((_, j) => j !== i));
                            setDirty(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-[13px] text-neutral-500">Aucune variante. Sans variante active, le produit ne peut pas être commandé.</p>
        )}
      </section>
    </div>
  );
}

function PriceCell({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder: string }) {
  const [text, setText] = useState(dtInput(value));
  return (
    <input
      inputMode="decimal"
      className="a-input w-24 py-1"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (!/^\d*\.?\d{0,3}$/.test(raw)) return;
        setText(raw);
        onChange(parseDt(raw));
      }}
    />
  );
}
