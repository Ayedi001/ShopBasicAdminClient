"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { del, post, put } from "@/lib/client-api";
import { AUDIENCES, SIZE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AUDIENCE_LABELS, SIZE_TYPE_LABELS } from "./labels";
import { ConfirmButton, Modal, Select, Spinner, TextArea, TextInput, Toggle, useAction } from "./ui";
import { ImageField } from "./image-field";

type Sub = {
  id?: string;
  categoryId: string;
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  productType: string;
  sizeType: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  sizeChartId: string;
  productCount?: number;
};
type Cat = {
  id?: string;
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  audience: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  sizeChartId: string;
  productCount?: number;
  subcategories?: Sub[];
};

const nullify = <T extends Record<string, unknown>>(o: T, keys: (keyof T)[]) => {
  const out: Record<string, unknown> = { ...o };
  for (const k of keys) if (out[k as string] === "") out[k as string] = null;
  return out;
};

export function CategoriesManager({ categories, sizeCharts }: { categories: Cat[]; sizeCharts: { id: string; name: string }[] }) {
  const [editCat, setEditCat] = useState<Cat | null>(null);
  const [editSub, setEditSub] = useState<Sub | null>(null);
  const chartOptions = sizeCharts.map((c) => ({ value: c.id, label: c.name }));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="a-btn-primary"
          onClick={() => setEditCat({ name: "", nameAr: "", nameEn: "", slug: "", audience: "WOMEN", description: "", imageUrl: "", sortOrder: (categories.length + 1) * 10, isActive: true, sizeChartId: "" })}
        >
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </button>
      </div>
      <div className="space-y-4">
        {categories.map((c) => (
          <section key={c.id} className="a-card">
            <header className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-4 py-3">
              {c.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">
                  {c.name} {!c.isActive && <span className="ml-1 rounded bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">Masquée</span>}
                </h2>
                <p className="text-[12px] text-neutral-500">
                  /c/{c.slug} · {AUDIENCE_LABELS[c.audience]} · {c.productCount} produit(s) · ordre {c.sortOrder}
                  {c.nameAr && ` · ${c.nameAr}`}
                </p>
              </div>
              <button
                type="button"
                className="a-btn a-btn-sm"
                onClick={() =>
                  setEditSub({ categoryId: c.id!, name: "", nameAr: "", nameEn: "", slug: "", productType: "", sizeType: "CLOTHING", imageUrl: "", sortOrder: ((c.subcategories?.length ?? 0) + 1) * 10, isActive: true, sizeChartId: "" })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Sous-catégorie
              </button>
              <button type="button" className="a-btn a-btn-sm" onClick={() => setEditCat(c)}>
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
              <ConfirmButton
                label="Supprimer la catégorie"
                className="a-btn a-btn-sm text-red-600"
                confirm={`Supprimer « ${c.name} » et ses sous-catégories ? Impossible si des produits l'utilisent : masquez-la plutôt.`}
                success="Catégorie supprimée"
                action={() => del(`/api/admin/categories/${c.id}`)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmButton>
            </header>
            {c.subcategories?.length ? (
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Sous-catégorie</th>
                    <th>Adresse</th>
                    <th>Tailles</th>
                    <th className="text-right">Produits</th>
                    <th>Visible</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.subcategories.map((s) => (
                    <tr key={s.id} className={cn(!s.isActive && "opacity-60")}>
                      <td className="font-medium">
                        {s.name}
                        {(s.nameAr || s.nameEn) && <span className="block text-[12px] font-normal text-neutral-500">{[s.nameAr, s.nameEn].filter(Boolean).join(" · ")}</span>}
                      </td>
                      <td className="text-[12px] text-neutral-500">
                        /c/{c.slug}/{s.slug}
                      </td>
                      <td className="text-[12px]">{SIZE_TYPE_LABELS[s.sizeType]}</td>
                      <td className="text-right tabular-nums">{s.productCount}</td>
                      <td>{s.isActive ? "Oui" : "Non"}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button type="button" className="a-btn a-btn-sm" onClick={() => setEditSub(s)} aria-label="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <ConfirmButton
                            label="Supprimer la sous-catégorie"
                            className="a-btn a-btn-sm text-red-600"
                            confirm={`Supprimer « ${s.name} » ?`}
                            success="Sous-catégorie supprimée"
                            action={() => del(`/api/admin/subcategories/${s.id}`)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-[13px] text-neutral-500">Aucune sous-catégorie.</p>
            )}
          </section>
        ))}
      </div>
      {editCat && <CategoryModal value={editCat} chartOptions={chartOptions} onClose={() => setEditCat(null)} />}
      {editSub && <SubcategoryModal value={editSub} categories={categories} chartOptions={chartOptions} onClose={() => setEditSub(null)} />}
    </>
  );
}

function CategoryModal({ value, chartOptions, onClose }: { value: Cat; chartOptions: { value: string; label: string }[]; onClose: () => void }) {
  const [f, setF] = useState(value);
  const { run, busy, errors } = useAction();
  const set = <K extends keyof Cat>(k: K, v: Cat[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const body = nullify({ name: f.name, nameAr: f.nameAr, nameEn: f.nameEn, slug: f.slug, audience: f.audience, description: f.description, imageUrl: f.imageUrl, sortOrder: f.sortOrder, isActive: f.isActive, sizeChartId: f.sizeChartId }, ["imageUrl", "sizeChartId", "nameAr", "nameEn", "description"]);
    run(() => (f.id ? put(`/api/admin/categories/${f.id}`, body) : post("/api/admin/categories", body)), { success: "Catégorie enregistrée", onDone: onClose });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={f.id ? `Modifier « ${value.name} »` : "Nouvelle catégorie"}
      footer={
        <>
          <button type="button" className="a-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="a-btn-primary" disabled={busy} onClick={save}>
            {busy && <Spinner />} Enregistrer
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput label="Nom (FR) *" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={80} />
        <TextInput label="Nom (AR)" dir="rtl" value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} maxLength={80} />
        <TextInput label="Nom (EN)" value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} maxLength={80} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <TextInput label="Adresse (slug)" value={f.slug} onChange={(e) => set("slug", e.target.value)} hint="Vide = généré" error={errors.slug} />
        <Select label="Public" value={f.audience} onChange={(e) => set("audience", e.target.value)} options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))} />
        <TextInput label="Ordre d'affichage" type="number" min={0} value={f.sortOrder} onChange={(e) => set("sortOrder", Math.max(0, Number(e.target.value) || 0))} />
      </div>
      <TextArea wrapClass="mt-3" label="Description" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={500} className="min-h-[60px]" />
      <Select wrapClass="mt-3" label="Guide des tailles par défaut" value={f.sizeChartId} onChange={(e) => set("sizeChartId", e.target.value)} placeholder="Aucun" options={chartOptions} />
      <div className="mt-3">
        <ImageField label="Image" folder="categories" value={f.imageUrl} onChange={(url) => set("imageUrl", url)} error={errors.imageUrl} />
      </div>
      <div className="mt-3">
        <Toggle label="Visible dans la boutique" checked={f.isActive} onChange={(v) => set("isActive", v)} />
      </div>
    </Modal>
  );
}

function SubcategoryModal({ value, categories, chartOptions, onClose }: { value: Sub; categories: Cat[]; chartOptions: { value: string; label: string }[]; onClose: () => void }) {
  const [f, setF] = useState(value);
  const { run, busy, errors } = useAction();
  const set = <K extends keyof Sub>(k: K, v: Sub[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const body = nullify(
      { categoryId: f.categoryId, name: f.name, nameAr: f.nameAr, nameEn: f.nameEn, slug: f.slug, productType: f.productType, sizeType: f.sizeType, imageUrl: f.imageUrl, sortOrder: f.sortOrder, isActive: f.isActive, sizeChartId: f.sizeChartId },
      ["imageUrl", "sizeChartId", "nameAr", "nameEn", "productType"],
    );
    run(() => (f.id ? put(`/api/admin/subcategories/${f.id}`, body) : post("/api/admin/subcategories", body)), { success: "Sous-catégorie enregistrée", onDone: onClose });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={f.id ? `Modifier « ${value.name} »` : "Nouvelle sous-catégorie"}
      footer={
        <>
          <button type="button" className="a-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="a-btn-primary" disabled={busy} onClick={save}>
            {busy && <Spinner />} Enregistrer
          </button>
        </>
      }
    >
      <Select label="Catégorie parente" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} options={categories.map((c) => ({ value: c.id!, label: c.name }))} error={errors.categoryId} />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <TextInput label="Nom (FR) *" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={80} />
        <TextInput label="Nom (AR)" dir="rtl" value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} maxLength={80} />
        <TextInput label="Nom (EN)" value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} maxLength={80} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <TextInput label="Adresse (slug)" value={f.slug} onChange={(e) => set("slug", e.target.value)} hint="Vide = généré" />
        <Select label="Système de tailles" value={f.sizeType} onChange={(e) => set("sizeType", e.target.value)} options={SIZE_TYPES.map((t) => ({ value: t, label: SIZE_TYPE_LABELS[t] }))} />
        <TextInput label="Ordre" type="number" min={0} value={f.sortOrder} onChange={(e) => set("sortOrder", Math.max(0, Number(e.target.value) || 0))} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TextInput label="Type de produit (recherche)" value={f.productType} onChange={(e) => set("productType", e.target.value)} hint="Mots-clés de recherche, ex. : veste blazer jacket" maxLength={60} />
        <Select label="Guide des tailles" value={f.sizeChartId} onChange={(e) => set("sizeChartId", e.target.value)} placeholder="Hériter de la catégorie" options={chartOptions} />
      </div>
      <div className="mt-3">
        <ImageField label="Image" folder="categories" value={f.imageUrl} onChange={(url) => set("imageUrl", url)} />
      </div>
      <div className="mt-3">
        <Toggle label="Visible dans la boutique" checked={f.isActive} onChange={(v) => set("isActive", v)} />
      </div>
    </Modal>
  );
}
