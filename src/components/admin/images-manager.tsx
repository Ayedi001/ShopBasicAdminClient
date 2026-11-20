"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { apiFetch, del, patch } from "@/lib/client-api";
import { IMAGE_VIEWS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { IMAGE_VIEW_LABELS } from "./labels";
import { ConfirmButton, Spinner, useAction } from "./ui";

type Color = { id: string; name: string; hex: string };
type Img = { id: string; url: string; thumbUrl: string; kind: string; view: string; colorId: string | null; isMain: boolean; alt: string };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm";

export function ImagesManager({ productId, colors, allColors, initial }: { productId: string; colors: Color[]; allColors: Color[]; initial: Img[] }) {
  const [images, setImages] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [uploadColor, setUploadColor] = useState(colors[0]?.id ?? "");
  const [uploadView, setUploadView] = useState("FRONT");
  const [dragId, setDragId] = useState<string | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { run, busy } = useAction();

  useEffect(() => setImages(initial), [initial]);

  const colorOptions = colors.length ? colors : allColors;
  const visible = images.filter((i) => filter === "all" || (filter === "shared" ? !i.colorId : i.colorId === filter));
  const countFor = (id: string | null) => images.filter((i) => i.colorId === id).length;

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);
    if (uploadColor) form.append("colorId", uploadColor);
    form.append("view", uploadView);
    run(() => apiFetch(`/api/admin/products/${productId}/images`, { method: "POST", body: form }), {
      success: `${files.length} fichier(s) ajouté(s)`,
      onDone: () => fileRef.current && (fileRef.current.value = ""),
    });
  };

  const move = (id: string, dir: -1 | 1) => {
    setImages((list) => {
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setOrderDirty(true);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setImages((list) => {
      const from = list.findIndex((x) => x.id === dragId);
      const to = list.findIndex((x) => x.id === targetId);
      const copy = [...list];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
    setDragId(null);
    setOrderDirty(true);
  };

  return (
    <div className="space-y-4">
      <section className="a-card p-4">
        <h2 className="text-[14px] font-semibold">Ajouter des photos ou vidéos</h2>
        <p className="mt-1 text-[12px] text-neutral-500">
          JPEG, PNG, WebP, AVIF (8 Mo max) ou MP4/WebM (50 Mo max). Les images sont optimisées automatiquement en plusieurs tailles. Associez chaque photo à sa couleur pour que la galerie change avec la couleur choisie.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label>
            <span className="a-label">Couleur</span>
            <select className="a-input" value={uploadColor} onChange={(e) => setUploadColor(e.target.value)}>
              <option value="">Toutes les couleurs (commune)</option>
              {colorOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="a-label">Vue</span>
            <select className="a-input" value={uploadView} onChange={(e) => setUploadView(e.target.value)}>
              {IMAGE_VIEWS.map((v) => (
                <option key={v} value={v}>
                  {IMAGE_VIEW_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <button type="button" className="a-btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Spinner /> : <Upload className="h-4 w-4" />} Choisir des fichiers
          </button>
        </div>
        {!colors.length && <p className="mt-3 text-[12px] text-amber-700">Ce produit n&apos;a pas encore de variante avec couleur : toutes les couleurs sont proposées.</p>}
      </section>

      <section className="a-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Toutes ({images.length})
            </FilterChip>
            <FilterChip active={filter === "shared"} onClick={() => setFilter("shared")}>
              Communes ({countFor(null)})
            </FilterChip>
            {colorOptions.map((c) => (
              <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} /> {c.name} ({countFor(c.id)})
              </FilterChip>
            ))}
          </div>
          {orderDirty && (
            <button
              type="button"
              className="a-btn-primary"
              disabled={busy}
              onClick={() => run(() => patch(`/api/admin/products/${productId}/images`, { ids: images.map((i) => i.id) }), { success: "Ordre enregistré", onDone: () => setOrderDirty(false) })}
            >
              Enregistrer l&apos;ordre
            </button>
          )}
        </header>
        {visible.length ? (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {visible.map((img) => (
              <ImageCard
                key={img.id}
                img={img}
                productId={productId}
                colors={allColors}
                dragging={dragId === img.id}
                onDragStart={() => setDragId(img.id)}
                onDrop={() => onDrop(img.id)}
                onMove={(d) => move(img.id, d)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-[13px] text-neutral-500">Aucun média dans cette sélection.</p>
        )}
        <p className="border-t border-neutral-100 px-4 py-2 text-[12px] text-neutral-500">Glissez-déposez les vignettes (ou utilisez les flèches) pour changer l&apos;ordre, puis enregistrez. La photo principale est utilisée sur les listes de produits.</p>
      </section>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:border-neutral-500")}>
      {children}
    </button>
  );
}

function ImageCard({
  img,
  productId,
  colors,
  dragging,
  onDragStart,
  onDrop,
  onMove,
}: {
  img: Img;
  productId: string;
  colors: Color[];
  dragging: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const { run, busy } = useAction();
  const replaceRef = useRef<HTMLInputElement>(null);
  const url = `/api/admin/products/${productId}/images/${img.id}`;
  const update = (body: Record<string, unknown>, success: string) => run(() => patch(url, body), { success });

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={cn("overflow-hidden rounded-lg border bg-white", img.isMain ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200", dragging && "opacity-40")}
    >
      <div className="relative aspect-[3/4] bg-neutral-100">
        {img.kind === "VIDEO" ? (
          <video src={img.url} className="h-full w-full object-cover" muted playsInline controls preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.thumbUrl} alt={img.alt} className="h-full w-full object-cover" loading="lazy" />
        )}
        <span className="absolute left-1.5 top-1.5 cursor-grab rounded bg-white/90 p-0.5 text-neutral-600" title="Glisser pour réordonner">
          <GripVertical className="h-4 w-4" />
        </span>
        {img.isMain && <span className="absolute right-1.5 top-1.5 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">Principale</span>}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Spinner />
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-2">
        <select className="a-input py-1 text-[12px]" value={img.colorId ?? ""} onChange={(e) => update({ colorId: e.target.value || null }, "Couleur mise à jour")} aria-label="Couleur">
          <option value="">Toutes couleurs</option>
          {colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="a-input py-1 text-[12px]" value={img.view} onChange={(e) => update({ view: e.target.value }, "Vue mise à jour")} aria-label="Vue">
          {IMAGE_VIEWS.map((v) => (
            <option key={v} value={v}>
              {IMAGE_VIEW_LABELS[v]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button type="button" className="a-btn a-btn-sm px-1.5" onClick={() => onMove(-1)} title="Avancer" aria-label="Avancer">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="a-btn a-btn-sm px-1.5" onClick={() => onMove(1)} title="Reculer" aria-label="Reculer">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {!img.isMain && img.kind === "IMAGE" && (
            <button type="button" className="a-btn a-btn-sm px-1.5" onClick={() => update({ isMain: true }, "Photo principale définie")} title="Définir comme principale" aria-label="Définir comme principale">
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            ref={replaceRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.append("file", file);
              run(() => apiFetch(url, { method: "PUT", body: form }), { success: "Fichier remplacé" });
              e.target.value = "";
            }}
          />
          <button type="button" className="a-btn a-btn-sm px-1.5" onClick={() => replaceRef.current?.click()} title="Remplacer le fichier" aria-label="Remplacer le fichier">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <ConfirmButton label="Supprimer le média" className="a-btn a-btn-sm ml-auto px-1.5 text-red-600" confirm="Supprimer définitivement ce média ?" success="Média supprimé" action={() => del(url)}>
            <Trash2 className="h-3.5 w-3.5" />
          </ConfirmButton>
        </div>
      </div>
    </li>
  );
}
