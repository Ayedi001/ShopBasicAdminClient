"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { post, put } from "@/lib/client-api";
import { AUDIENCES, FIT_TYPES, PRODUCT_STATUSES, SEASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProductEditorOptions } from "@/server/admin-product-data";
import { AUDIENCE_LABELS, FIT_LABELS, PRODUCT_STATUS_LABELS, SEASON_LABELS } from "./labels";
import { MoneyInput, Select, Spinner, TextArea, TextInput, Toggle, useAction } from "./ui";

type Translation = { locale: "ar" | "en"; name: string; shortDescription: string; description: string; careInstructions: string };

export type ProductFormValue = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  audience: string;
  categoryId: string;
  subcategoryId: string;
  brandName: string;
  collectionId: string;
  season: string;
  fitType: string;
  weightGrams: number | null;
  careInstructions: string;
  countryOfOrigin: string;
  characteristics: string;
  price: number;
  salePrice: number | null;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isOnSale: boolean;
  sizeChartId: string;
  metaTitle: string;
  metaDescription: string;
  materials: { materialName: string; percentage: number }[];
  translations: Translation[];
};

const EMPTY: ProductFormValue = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  audience: "WOMEN",
  categoryId: "",
  subcategoryId: "",
  brandName: "",
  collectionId: "",
  season: "ALL",
  fitType: "",
  weightGrams: null,
  careInstructions: "",
  countryOfOrigin: "",
  characteristics: "",
  price: 0,
  salePrice: null,
  status: "DRAFT",
  isFeatured: false,
  isNewArrival: true,
  isBestSeller: false,
  isOnSale: false,
  sizeChartId: "",
  metaTitle: "",
  metaDescription: "",
  materials: [],
  translations: [
    { locale: "ar", name: "", shortDescription: "", description: "", careInstructions: "" },
    { locale: "en", name: "", shortDescription: "", description: "", careInstructions: "" },
  ],
};

export function ProductForm({ options, productId, initial }: { options: ProductEditorOptions; productId?: string; initial?: ProductFormValue }) {
  const router = useRouter();
  const [f, setF] = useState<ProductFormValue>(initial ?? { ...EMPTY, categoryId: options.categories[0]?.id ?? "", audience: options.categories[0]?.audience ?? "WOMEN" });
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const { run, busy, errors } = useAction();
  const set = <K extends keyof ProductFormValue>(k: K, v: ProductFormValue[K]) => setF((x) => ({ ...x, [k]: v }));

  const category = options.categories.find((c) => c.id === f.categoryId);
  const materialTotal = f.materials.reduce((s, m) => s + (Number(m.percentage) || 0), 0);
  const tr = f.translations.find((t) => t.locale === lang)!;
  const setTr = (patch: Partial<Translation>) => setF((x) => ({ ...x, translations: x.translations.map((t) => (t.locale === lang ? { ...t, ...patch } : t)) }));
  const chartHint = useMemo(() => {
    const sub = category?.subcategories.find((s) => s.id === f.subcategoryId);
    const inherited = sub?.sizeChartId ?? category?.sizeChartId;
    const name = options.sizeCharts.find((c) => c.id === inherited)?.name;
    return name ? `Par défaut : « ${name} » (hérité de la catégorie)` : "Aucun guide hérité de la catégorie";
  }, [category, f.subcategoryId, options.sizeCharts]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...f,
      sku: f.sku || null,
      subcategoryId: f.subcategoryId || null,
      collectionId: f.collectionId || null,
      sizeChartId: f.sizeChartId || null,
      fitType: f.fitType || null,
      brandName: f.brandName || null,
      materials: f.materials.filter((m) => m.materialName.trim()).map((m) => ({ materialName: m.materialName.trim(), percentage: Number(m.percentage) || 0 })),
    };
    if (productId) {
      run(() => put(`/api/admin/products/${productId}`, body), { success: "Produit enregistré" });
    } else {
      run(() => post<{ id: string }>("/api/admin/products", body), {
        success: "Produit créé. Ajoutez maintenant ses variantes.",
        refresh: false,
        onDone: (r) => router.push(`/admin/products/${r.id}?tab=variants`),
      });
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 xl:grid-cols-3" noValidate>
      <div className="space-y-4 xl:col-span-2">
        <section className="a-card space-y-4 p-4">
          <h2 className="text-[14px] font-semibold">Informations générales</h2>
          <TextInput label="Nom du produit (français) *" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={150} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Référence (SKU produit)" value={f.sku} onChange={(e) => set("sku", e.target.value)} error={errors.sku} maxLength={60} placeholder="Ex. : VST-001" />
            <TextInput label="Adresse (slug)" value={f.slug} onChange={(e) => set("slug", e.target.value)} error={errors.slug} hint="Laissez vide pour la générer depuis le nom" maxLength={100} />
          </div>
          <TextArea label="Description courte" value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} error={errors.shortDescription} maxLength={300} className="min-h-[60px]" />
          <TextArea label="Description complète *" value={f.description} onChange={(e) => set("description", e.target.value)} error={errors.description} className="min-h-[140px]" maxLength={10000} />
          <TextArea
            label="Caractéristiques"
            value={f.characteristics}
            onChange={(e) => set("characteristics", e.target.value)}
            error={errors.characteristics}
            hint="Une caractéristique par ligne (ex. : Fermeture zippée, Deux poches latérales)"
            maxLength={3000}
          />
          <TextArea label="Conseils d'entretien" value={f.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} error={errors.careInstructions} className="min-h-[60px]" maxLength={2000} />
        </section>

        <details className="a-card p-4" open={f.materials.length > 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
            <span>Composition (facultatif)</span>
            <span className={cn("text-[12px] font-medium", f.materials.length && materialTotal !== 100 ? "text-red-600" : "text-neutral-500")}>Total : {materialTotal}%</span>
          </summary>
          <div className="mt-4 space-y-4">
            <datalist id="materials-list">
              {options.materials.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {f.materials.map((m, i) => (
              <div key={i} className="flex items-end gap-2">
                <TextInput
                  wrapClass="flex-1"
                  label="Matière"
                  list="materials-list"
                  value={m.materialName}
                  onChange={(e) => set("materials", f.materials.map((x, j) => (j === i ? { ...x, materialName: e.target.value } : x)))}
                />
                <TextInput
                  wrapClass="w-28"
                  label="%"
                  type="number"
                  min={1}
                  max={100}
                  value={m.percentage || ""}
                  onChange={(e) => set("materials", f.materials.map((x, j) => (j === i ? { ...x, percentage: Number(e.target.value) } : x)))}
                />
                <button type="button" className="a-btn mb-px" onClick={() => set("materials", f.materials.filter((_, j) => j !== i))} aria-label="Retirer la matière">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {errors.materials && <p className="text-[12px] text-red-600">{errors.materials}</p>}
            {f.materials.length < 10 && (
              <button type="button" className="a-btn" onClick={() => set("materials", [...f.materials, { materialName: "", percentage: Math.max(0, 100 - materialTotal) }])}>
                <Plus className="h-4 w-4" /> Ajouter une matière
              </button>
            )}
          </div>
        </details>

        <details className="a-card p-4">
          <summary className="cursor-pointer list-none text-[14px] font-semibold">Traductions AR / EN (facultatif)</summary>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-neutral-500">Sans traduction, la version française est affichée.</p>
              <div className="flex rounded-md border border-neutral-200 p-0.5">
                {(["ar", "en"] as const).map((l) => (
                  <button key={l} type="button" onClick={() => setLang(l)} className={cn("rounded px-2.5 py-1 text-[12px]", lang === l ? "bg-neutral-900 text-white" : "text-neutral-600")}>
                    {l === "ar" ? "Arabe" : "Anglais"}
                  </button>
                ))}
              </div>
            </div>
            <div dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-3">
              <TextInput label="Nom" value={tr.name} onChange={(e) => setTr({ name: e.target.value })} maxLength={150} />
              <TextArea label="Description courte" value={tr.shortDescription} onChange={(e) => setTr({ shortDescription: e.target.value })} className="min-h-[60px]" maxLength={300} />
              <TextArea label="Description" value={tr.description} onChange={(e) => setTr({ description: e.target.value })} className="min-h-[120px]" maxLength={10000} />
              <TextArea label="Entretien" value={tr.careInstructions} onChange={(e) => setTr({ careInstructions: e.target.value })} className="min-h-[60px]" maxLength={2000} />
            </div>
          </div>
        </details>

        <details className="a-card p-4">
          <summary className="cursor-pointer list-none text-[14px] font-semibold">Référencement SEO (facultatif)</summary>
          <div className="mt-3 space-y-3">
            <TextInput label="Titre SEO" value={f.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} hint={`${f.metaTitle.length}/160 · vide = nom du produit`} maxLength={160} error={errors.metaTitle} />
            <TextArea label="Méta-description" value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} hint={`${f.metaDescription.length}/320 · vide = description courte`} maxLength={320} className="min-h-[60px]" error={errors.metaDescription} />
          </div>
        </details>
      </div>

      <div className="space-y-4">
        <section className="a-card space-y-3 p-4">
          <h2 className="text-[14px] font-semibold">Publication</h2>
          <Select label="Statut" value={f.status} onChange={(e) => set("status", e.target.value)} options={PRODUCT_STATUSES.map((s) => ({ value: s, label: PRODUCT_STATUS_LABELS[s] }))} hint="Seuls les produits publiés sont visibles en boutique." />
          <div className="space-y-2 pt-1">
            <Toggle label="Mis en avant" checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} />
            <Toggle label="Nouveauté" checked={f.isNewArrival} onChange={(v) => set("isNewArrival", v)} />
            <Toggle label="Meilleure vente" checked={f.isBestSeller} onChange={(v) => set("isBestSeller", v)} hint="Les meilleures ventes sont aussi calculées automatiquement." />
            <Toggle label="Afficher dans « Promotions »" checked={f.isOnSale} onChange={(v) => set("isOnSale", v)} />
          </div>
          <button type="submit" className="a-btn-primary w-full py-2" disabled={busy}>
            {busy && <Spinner />} {productId ? "Enregistrer les modifications" : "Créer le produit"}
          </button>
        </section>

        <section className="a-card space-y-3 p-4">
          <h2 className="text-[14px] font-semibold">Prix</h2>
          <MoneyInput label="Prix de vente *" value={f.price} onChange={(v) => set("price", v ?? 0)} error={errors.price} />
          <MoneyInput label="Prix promotionnel" value={f.salePrice} onChange={(v) => set("salePrice", v)} allowEmpty error={errors.salePrice} hint="Facultatif. Les promotions automatiques s'appliquent aussi." />
          <p className="text-[12px] text-neutral-500">Chaque variante peut avoir son propre prix (onglet Variantes).</p>
        </section>

        <section className="a-card space-y-3 p-4">
          <h2 className="text-[14px] font-semibold">Classement</h2>
          <Select
            label="Catégorie *"
            value={f.categoryId}
            error={errors.categoryId}
            onChange={(e) => {
              const c = options.categories.find((x) => x.id === e.target.value);
              setF((x) => ({ ...x, categoryId: e.target.value, subcategoryId: "", audience: c?.audience ?? x.audience }));
            }}
            options={options.categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Sous-catégorie"
            value={f.subcategoryId}
            error={errors.subcategoryId}
            onChange={(e) => set("subcategoryId", e.target.value)}
            placeholder="—"
            options={(category?.subcategories ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select label="Public" value={f.audience} onChange={(e) => set("audience", e.target.value)} options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))} />
          <Select label="Collection" value={f.collectionId} onChange={(e) => set("collectionId", e.target.value)} placeholder="Aucune" options={options.collections.map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Saison" value={f.season} onChange={(e) => set("season", e.target.value)} options={SEASONS.map((s) => ({ value: s, label: SEASON_LABELS[s] }))} />
          <datalist id="brands-list">
            {options.brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <TextInput label="Marque" list="brands-list" value={f.brandName} onChange={(e) => set("brandName", e.target.value)} maxLength={80} error={errors.brandName} />
        </section>

        <details className="a-card p-4">
          <summary className="cursor-pointer list-none text-[14px] font-semibold">Détails avancés (facultatif)</summary>
          <div className="mt-3 space-y-3">
            <Select label="Coupe" value={f.fitType} onChange={(e) => set("fitType", e.target.value)} placeholder="Non précisée" options={FIT_TYPES.map((x) => ({ value: x, label: FIT_LABELS[x] }))} />
            <Select label="Guide des tailles" value={f.sizeChartId} onChange={(e) => set("sizeChartId", e.target.value)} placeholder="Hériter de la catégorie" options={options.sizeCharts.map((c) => ({ value: c.id, label: c.name }))} hint={chartHint} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Poids (g)"
                type="number"
                min={0}
                value={f.weightGrams ?? ""}
                onChange={(e) => set("weightGrams", e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))))}
                error={errors.weightGrams}
              />
              <TextInput label="Pays d'origine" value={f.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} maxLength={80} />
            </div>
          </div>
        </details>
      </div>
    </form>
  );
}
