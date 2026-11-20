"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { put } from "@/lib/client-api";
import { HOME_SECTION_LABELS } from "./labels";
import { Badge, Card, Empty } from "./parts";
import { Modal, Spinner, TextInput, Toggle, useAction } from "./ui";

type Section = {
  id: string;
  type: string;
  title: string | null;
  titleAr: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleAr: string | null;
  subtitleEn: string | null;
  isVisible: boolean;
  sortOrder: number;
  config: Record<string, string | number | boolean | null>;
};

export function HomeSectionsEditor({ sections: initial }: { sections: Section[] }) {
  const [editing, setEditing] = useState<Section | null>(null);

  return (
    <Card title="Sections de la page d'accueil" bodyClass="p-0">
      {initial.length ? (
        <table className="a-table">
          <thead>
            <tr>
              <th>Ordre</th>
              <th>Section</th>
              <th>Titre</th>
              <th>Visible</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {initial.map((s) => (
              <tr key={s.id}>
                <td className="tabular-nums text-neutral-500">{s.sortOrder}</td>
                <td className="font-medium">{HOME_SECTION_LABELS[s.type] ?? s.type}</td>
                <td className="text-neutral-600">{s.title || "—"}</td>
                <td>
                  <Badge status={s.isVisible ? "ACTIVE" : "INACTIVE"}>{s.isVisible ? "Oui" : "Non"}</Badge>
                </td>
                <td>
                  <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>Aucune section. Relancez le seed pour créer la structure par défaut.</Empty>
      )}
      {editing && <SectionModal value={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function SectionModal({ value, onClose }: { value: Section; onClose: () => void }) {
  const [f, setF] = useState({
    title: value.title ?? "",
    titleAr: value.titleAr ?? "",
    titleEn: value.titleEn ?? "",
    subtitle: value.subtitle ?? "",
    subtitleAr: value.subtitleAr ?? "",
    subtitleEn: value.subtitleEn ?? "",
    isVisible: value.isVisible,
    sortOrder: value.sortOrder,
    config: { ...value.config },
  });
  const { run, busy, errors } = useAction();
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const setCfg = (k: string, v: string | number | boolean | null) => setF((x) => ({ ...x, config: { ...x.config, [k]: v } }));

  const productTypes = ["NEW_ARRIVALS", "BEST_SELLERS", "ON_SALE", "FEATURED", "COLLECTIONS", "RECENTLY_VIEWED"];

  return (
    <Modal
      open
      onClose={onClose}
      title={HOME_SECTION_LABELS[value.type] ?? value.type}
      size="lg"
      footer={
        <>
          <button type="button" className="a-btn" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="a-btn-primary"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  put(`/api/admin/home-sections/${value.id}`, {
                    title: f.title || null,
                    titleAr: f.titleAr || null,
                    titleEn: f.titleEn || null,
                    subtitle: f.subtitle || null,
                    subtitleAr: f.subtitleAr || null,
                    subtitleEn: f.subtitleEn || null,
                    isVisible: f.isVisible,
                    sortOrder: f.sortOrder,
                    config: f.config,
                  }),
                { success: "Section enregistrée", onDone: onClose },
              )
            }
          >
            {busy && <Spinner />} Enregistrer
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Titre (FR)" value={f.title} onChange={(e) => set("title", e.target.value)} error={errors.title} />
        <TextInput label="Titre (AR)" value={f.titleAr} onChange={(e) => set("titleAr", e.target.value)} dir="rtl" />
        <TextInput label="Titre (EN)" value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
        <TextInput label="Ordre" type="number" min={0} value={f.sortOrder} onChange={(e) => set("sortOrder", Math.max(0, Number(e.target.value) || 0))} />
        <TextInput label="Sous-titre (FR)" value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} wrapClass="sm:col-span-2" />
        <TextInput label="Sous-titre (AR)" value={f.subtitleAr} onChange={(e) => set("subtitleAr", e.target.value)} dir="rtl" wrapClass="sm:col-span-2" />
        <TextInput label="Sous-titre (EN)" value={f.subtitleEn} onChange={(e) => set("subtitleEn", e.target.value)} wrapClass="sm:col-span-2" />
        <Toggle label="Section visible" checked={f.isVisible} onChange={(v) => set("isVisible", v)} />
        {productTypes.includes(value.type) && (
          <TextInput
            label="Nombre de produits"
            type="number"
            min={4}
            max={24}
            value={Number(f.config.limit ?? 8)}
            onChange={(e) => setCfg("limit", Math.min(24, Math.max(4, Number(e.target.value) || 8)))}
          />
        )}
        {value.type === "PROMO_TEXT" && (
          <>
            <TextInput label="Texte promo" value={String(f.config.text ?? "")} onChange={(e) => setCfg("text", e.target.value)} wrapClass="sm:col-span-2" />
            <TextInput label="Lien" value={String(f.config.link ?? "")} onChange={(e) => setCfg("link", e.target.value)} wrapClass="sm:col-span-2" />
          </>
        )}
      </div>
    </Modal>
  );
}
