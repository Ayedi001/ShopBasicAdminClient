"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { del, post, put } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";
import { DISCOUNT_TYPE_LABELS, SCOPE_LABELS } from "./labels";
import { Badge, Card, Empty } from "./parts";
import { ConfirmButton, MoneyInput, Modal, Select, Spinner, TextArea, TextInput, Toggle, fromLocalInput, toLocalInput, useAction } from "./ui";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string; categoryId?: string };
type Promo = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  scope: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
  subcategoryIds: string[];
};
type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usedCount: number;
  scope: string;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
};

export function PromotionsManager({
  promotions,
  coupons,
  categories,
  subcategories,
  products,
}: {
  promotions: Promo[];
  coupons: Coupon[];
  categories: Opt[];
  subcategories: Opt[];
  products: Opt[];
}) {
  const [tab, setTab] = useState<"promos" | "coupons">("promos");
  const [editPromo, setEditPromo] = useState<Partial<Promo> | null>(null);
  const [editCoupon, setEditCoupon] = useState<Partial<Coupon> | null>(null);

  return (
    <>
      <div className="mb-3 flex gap-1 border-b border-neutral-200">
        {(
          [
            { key: "promos", label: `Promotions (${promotions.length})` },
            { key: "coupons", label: `Coupons (${coupons.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[13px]", tab === t.key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "promos" && (
        <Card
          title="Promotions catalogue"
          actions={
            <button type="button" className="a-btn-primary a-btn-sm" onClick={() => setEditPromo({ name: "", description: "", type: "PERCENT", value: 10, scope: "ALL", isActive: true, productIds: [], categoryIds: [], subcategoryIds: [] })}>
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          }
          bodyClass="p-0"
        >
          {promotions.length ? (
            <table className="a-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Remise</th>
                  <th>Portée</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.type === "PERCENT" ? `${p.value} %` : formatMoney(p.value)}</td>
                    <td className="text-[12px] text-neutral-600">{SCOPE_LABELS[p.scope]}</td>
                    <td className="text-[12px] text-neutral-500">
                      {p.startsAt ? new Date(p.startsAt).toLocaleDateString("fr-FR") : "—"} → {p.endsAt ? new Date(p.endsAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td>
                      <Badge status={p.isActive ? "ACTIVE" : "INACTIVE"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="a-btn a-btn-sm" onClick={() => setEditPromo(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ConfirmButton label="Supprimer" className="a-btn a-btn-sm text-red-600" confirm="Supprimer cette promotion ?" success="Supprimée" action={() => del(`/api/admin/promotions/${p.id}`)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Aucune promotion.</Empty>
          )}
        </Card>
      )}

      {tab === "coupons" && (
        <Card
          title="Codes promo"
          actions={
            <button
              type="button"
              className="a-btn-primary a-btn-sm"
              onClick={() => setEditCoupon({ code: "", description: "", type: "PERCENT", value: 10, minOrderAmount: 0, maxUses: null, maxUsesPerUser: 1, scope: "ALL", isActive: true, productIds: [], categoryIds: [] })}
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          }
          bodyClass="p-0"
        >
          {coupons.length ? (
            <table className="a-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Remise</th>
                  <th>Min. commande</th>
                  <th>Utilisations</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-semibold">{c.code}</td>
                    <td>{c.type === "PERCENT" ? `${c.value} %` : formatMoney(c.value)}</td>
                    <td>{c.minOrderAmount ? formatMoney(c.minOrderAmount) : "—"}</td>
                    <td className="tabular-nums">
                      {c.usedCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className="text-[12px] text-neutral-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("fr-FR") : "—"}</td>
                    <td>
                      <Badge status={c.isActive ? "ACTIVE" : "INACTIVE"}>{c.isActive ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="a-btn a-btn-sm" onClick={() => setEditCoupon(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ConfirmButton label="Supprimer" className="a-btn a-btn-sm text-red-600" confirm="Supprimer ou désactiver ce coupon ?" success="Traité" action={() => del(`/api/admin/coupons/${c.id}`)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Aucun coupon.</Empty>
          )}
        </Card>
      )}

      {editPromo && <PromoModal value={editPromo} categories={categories} subcategories={subcategories} products={products} onClose={() => setEditPromo(null)} />}
      {editCoupon && <CouponModal value={editCoupon} categories={categories} products={products} onClose={() => setEditCoupon(null)} />}
    </>
  );
}

function MultiCheck({ label, options, value, onChange }: { label: string; options: Opt[]; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="sm:col-span-2">
      <span className="a-label">{label}</span>
      <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-neutral-200 p-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 py-0.5 text-[13px]">
            <input
              type="checkbox"
              className="accent-neutral-900"
              checked={value.includes(o.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))}
            />
            {o.name}
          </label>
        ))}
        {!options.length && <p className="text-[12px] text-neutral-400">Aucun élément.</p>}
      </div>
    </div>
  );
}

function PromoModal({ value, categories, subcategories, products, onClose }: { value: Partial<Promo>; categories: Opt[]; subcategories: Opt[]; products: Opt[]; onClose: () => void }) {
  const [f, setF] = useState({
    name: value.name ?? "",
    description: value.description ?? "",
    type: value.type ?? "PERCENT",
    value: value.value ?? 10,
    scope: value.scope ?? "ALL",
    startsAt: toLocalInput(value.startsAt),
    endsAt: toLocalInput(value.endsAt),
    isActive: value.isActive ?? true,
    productIds: value.productIds ?? [],
    categoryIds: value.categoryIds ?? [],
    subcategoryIds: value.subcategoryIds ?? [],
  });
  const { run, busy, errors } = useAction();
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const body = {
      ...f,
      startsAt: fromLocalInput(f.startsAt) || null,
      endsAt: fromLocalInput(f.endsAt) || null,
      value: f.type === "PERCENT" ? Number(f.value) : Number(f.value),
    };
    run(() => (value.id ? put(`/api/admin/promotions/${value.id}`, body) : post("/api/admin/promotions", body)), { success: "Promotion enregistrée", onDone: onClose });
  };

  return (
    <Modal open onClose={onClose} title={value.id ? "Modifier la promotion" : "Nouvelle promotion"} size="lg" footer={<Footer busy={busy} onClose={onClose} onSave={save} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Nom *" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} wrapClass="sm:col-span-2" />
        <TextArea label="Description" value={f.description} onChange={(e) => set("description", e.target.value)} wrapClass="sm:col-span-2" />
        <Select label="Type" value={f.type} onChange={(e) => set("type", e.target.value)} options={Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        {f.type === "PERCENT" ? (
          <TextInput label="Pourcentage *" type="number" min={1} max={90} value={f.value} onChange={(e) => set("value", Math.min(90, Math.max(1, Number(e.target.value) || 1)))} error={errors.value} />
        ) : (
          <MoneyInput label="Montant *" value={f.value} onChange={(m) => set("value", m ?? 0)} error={errors.value} />
        )}
        <Select label="Portée" value={f.scope} onChange={(e) => set("scope", e.target.value)} options={["ALL", "PRODUCTS", "CATEGORIES", "SUBCATEGORIES"].map((v) => ({ value: v, label: SCOPE_LABELS[v] }))} wrapClass="sm:col-span-2" />
        {f.scope === "PRODUCTS" && <MultiCheck label="Produits" options={products} value={f.productIds} onChange={(ids) => set("productIds", ids)} />}
        {f.scope === "CATEGORIES" && <MultiCheck label="Catégories" options={categories} value={f.categoryIds} onChange={(ids) => set("categoryIds", ids)} />}
        {f.scope === "SUBCATEGORIES" && <MultiCheck label="Sous-catégories" options={subcategories} value={f.subcategoryIds} onChange={(ids) => set("subcategoryIds", ids)} />}
        <TextInput label="Début" type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        <TextInput label="Fin" type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
        <Toggle label="Active" checked={f.isActive} onChange={(v) => set("isActive", v)} />
      </div>
    </Modal>
  );
}

function CouponModal({ value, categories, products, onClose }: { value: Partial<Coupon>; categories: Opt[]; products: Opt[]; onClose: () => void }) {
  const [f, setF] = useState({
    code: value.code ?? "",
    description: value.description ?? "",
    type: value.type ?? "PERCENT",
    value: value.value ?? 10,
    minOrderAmount: value.minOrderAmount ?? 0,
    maxUses: value.maxUses ?? null,
    maxUsesPerUser: value.maxUsesPerUser ?? 1,
    scope: value.scope ?? "ALL",
    startsAt: toLocalInput(value.startsAt),
    expiresAt: toLocalInput(value.expiresAt),
    isActive: value.isActive ?? true,
    productIds: value.productIds ?? [],
    categoryIds: value.categoryIds ?? [],
  });
  const { run, busy, errors } = useAction();
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const body = {
      ...f,
      startsAt: fromLocalInput(f.startsAt) || null,
      expiresAt: fromLocalInput(f.expiresAt) || null,
      maxUses: f.maxUses || null,
      maxUsesPerUser: f.maxUsesPerUser || null,
    };
    run(() => (value.id ? put(`/api/admin/coupons/${value.id}`, body) : post("/api/admin/coupons", body)), { success: "Coupon enregistré", onDone: onClose });
  };

  return (
    <Modal open onClose={onClose} title={value.id ? "Modifier le coupon" : "Nouveau coupon"} size="lg" footer={<Footer busy={busy} onClose={onClose} onSave={save} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Code *" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} error={errors.code} hint="Lettres, chiffres, - et _" />
        <Select label="Type" value={f.type} onChange={(e) => set("type", e.target.value)} options={Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        {f.type === "PERCENT" ? (
          <TextInput label="Pourcentage *" type="number" min={1} max={90} value={f.value} onChange={(e) => set("value", Math.min(90, Math.max(1, Number(e.target.value) || 1)))} error={errors.value} />
        ) : (
          <MoneyInput label="Montant *" value={f.value} onChange={(m) => set("value", m ?? 0)} error={errors.value} />
        )}
        <MoneyInput label="Montant minimum" value={f.minOrderAmount} onChange={(m) => set("minOrderAmount", m ?? 0)} />
        <TextInput label="Utilisations max (global)" type="number" min={1} value={f.maxUses ?? ""} onChange={(e) => set("maxUses", e.target.value === "" ? null : Math.max(1, Number(e.target.value) || 1))} />
        <TextInput label="Max par client" type="number" min={1} value={f.maxUsesPerUser ?? ""} onChange={(e) => set("maxUsesPerUser", e.target.value === "" ? null : Math.max(1, Number(e.target.value) || 1))} />
        <Select label="Portée" value={f.scope} onChange={(e) => set("scope", e.target.value)} options={["ALL", "PRODUCTS", "CATEGORIES"].map((v) => ({ value: v, label: SCOPE_LABELS[v] }))} wrapClass="sm:col-span-2" />
        {f.scope === "PRODUCTS" && <MultiCheck label="Produits" options={products} value={f.productIds} onChange={(ids) => set("productIds", ids)} />}
        {f.scope === "CATEGORIES" && <MultiCheck label="Catégories" options={categories} value={f.categoryIds} onChange={(ids) => set("categoryIds", ids)} />}
        <TextArea label="Description" value={f.description} onChange={(e) => set("description", e.target.value)} wrapClass="sm:col-span-2" />
        <TextInput label="Début" type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        <TextInput label="Expiration" type="datetime-local" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
        <Toggle label="Actif" checked={f.isActive} onChange={(v) => set("isActive", v)} />
      </div>
    </Modal>
  );
}

function Footer({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <>
      <button type="button" className="a-btn" onClick={onClose}>
        Annuler
      </button>
      <button type="button" className="a-btn-primary" disabled={busy} onClick={onSave}>
        {busy && <Spinner />} Enregistrer
      </button>
    </>
  );
}
