"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { del, post, put } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { ConfirmButton, Field, MoneyInput, Modal, Select, Spinner, TextArea, TextInput, Toggle, fromLocalInput, toLocalInput, useAction } from "./ui";
import { ImageField } from "./image-field";

export type CrudField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "money" | "color" | "select" | "toggle" | "image" | "datetime";
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Empty strings are sent as null */
  nullable?: boolean;
  hint?: string;
  rtl?: boolean;
  folder?: "banners" | "categories" | "collections" | "store";
  /** Show as a column in the list */
  column?: boolean;
  span?: 1 | 2 | 3;
  max?: number;
};

type Item = Record<string, unknown> & { id: string };

export function SimpleCrud({
  items,
  fields,
  endpoint,
  entityLabel,
  defaults,
  title,
  description,
  deleteConfirm,
}: {
  items: Item[];
  fields: CrudField[];
  endpoint: string;
  entityLabel: string;
  defaults: Record<string, unknown>;
  title?: string;
  description?: string;
  deleteConfirm?: string;
}) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const columns = fields.filter((f) => f.column);

  return (
    <section className="a-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div>
          {title && <h2 className="text-[14px] font-semibold">{title}</h2>}
          {description && <p className="text-[12px] text-neutral-500">{description}</p>}
        </div>
        <button type="button" className="a-btn-primary a-btn-sm" onClick={() => setEditing({ ...defaults })}>
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </header>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label.replace(" *", "")}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{renderCell(c, it[c.key])}</td>
                  ))}
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing({ ...it })} aria-label="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <ConfirmButton
                        label={`Supprimer : ${entityLabel}`}
                        className="a-btn a-btn-sm text-red-600"
                        confirm={deleteConfirm ?? "Cette suppression est définitive. Continuer ?"}
                        success="Supprimé"
                        action={() => del(`${endpoint}/${it.id}`)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-[13px] text-neutral-500">Aucun élément.</p>
      )}
      {editing && <EditModal value={editing} fields={fields} endpoint={endpoint} entityLabel={entityLabel} onClose={() => setEditing(null)} />}
    </section>
  );
}

function renderCell(f: CrudField, v: unknown) {
  if (f.type === "color" && typeof v === "string")
    return (
      <span className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-full ring-1 ring-black/15" style={{ background: v }} /> <code className="text-[12px] text-neutral-500">{v}</code>
      </span>
    );
  if (f.type === "toggle") return v ? "Oui" : "Non";
  if (f.type === "money") return typeof v === "number" ? formatMoney(v) : "—";
  if (f.type === "image")
    return typeof v === "string" && v ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={v} alt="" className="h-10 w-16 rounded object-cover" />
    ) : (
      "—"
    );
  if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? String(v ?? "—");
  if (f.type === "datetime") return v ? new Date(String(v)).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
  return <span className={cn(f.key === "name" || f.key === "title" || f.key === "label" ? "font-medium" : "")}>{v == null || v === "" ? "—" : String(v)}</span>;
}

function EditModal({ value, fields, endpoint, entityLabel, onClose }: { value: Record<string, unknown>; fields: CrudField[]; endpoint: string; entityLabel: string; onClose: () => void }) {
  const [f, setF] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = { ...value };
    for (const field of fields) {
      if (field.type === "datetime") init[field.key] = toLocalInput(value[field.key] as string | null);
      else if (init[field.key] == null && field.type !== "money") init[field.key] = field.type === "toggle" ? false : field.type === "number" ? 0 : "";
    }
    return init;
  });
  const { run, busy, errors } = useAction();
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const id = value.id as string | undefined;

  const save = () => {
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      let v = f[field.key];
      if (field.type === "datetime") v = fromLocalInput(String(v ?? ""));
      if (field.nullable && v === "") v = null;
      body[field.key] = v;
    }
    run(() => (id ? put(`${endpoint}/${id}`, body) : post(endpoint, body)), { success: "Enregistré", onDone: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={id ? `Modifier : ${entityLabel}` : `Ajouter : ${entityLabel}`}
      size={fields.length > 8 ? "lg" : "md"}
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
        {fields.map((field) => {
          const span = field.span === 1 ? "" : field.span === 2 ? "sm:col-span-2" : "sm:col-span-3";
          const common = { label: field.label, error: errors[field.key], hint: field.hint, wrapClass: span };
          const v = f[field.key];
          switch (field.type) {
            case "textarea":
              return <TextArea key={field.key} {...common} dir={field.rtl ? "rtl" : undefined} value={String(v ?? "")} onChange={(e) => set(field.key, e.target.value)} maxLength={field.max} />;
            case "number":
              return <TextInput key={field.key} {...common} type="number" min={0} value={Number(v ?? 0)} onChange={(e) => set(field.key, Math.max(0, Math.round(Number(e.target.value) || 0)))} />;
            case "money":
              return <MoneyInput key={field.key} {...common} value={(v as number | null) ?? null} onChange={(m) => set(field.key, m ?? 0)} />;
            case "color":
              return (
                <Field key={field.key} label={field.label} error={errors[field.key]} className={span}>
                  <div className="flex gap-2">
                    <input type="color" className="h-9 w-12 cursor-pointer rounded border border-neutral-300" value={String(v || "#000000")} onChange={(e) => set(field.key, e.target.value)} />
                    <input className="a-input" value={String(v ?? "")} onChange={(e) => set(field.key, e.target.value)} maxLength={7} placeholder="#000000" />
                  </div>
                </Field>
              );
            case "select":
              return <Select key={field.key} {...common} value={String(v ?? "")} onChange={(e) => set(field.key, e.target.value)} options={field.options ?? []} placeholder={field.nullable ? "—" : undefined} />;
            case "toggle":
              return (
                <div key={field.key} className={cn("pt-1", span)}>
                  <Toggle label={field.label} checked={!!v} onChange={(b) => set(field.key, b)} hint={field.hint} />
                </div>
              );
            case "image":
              return (
                <div key={field.key} className={span}>
                  <ImageField label={field.label} folder={field.folder ?? "banners"} value={String(v ?? "")} onChange={(url) => set(field.key, url)} error={errors[field.key]} hint={field.hint} />
                </div>
              );
            case "datetime":
              return <TextInput key={field.key} {...common} type="datetime-local" value={String(v ?? "")} onChange={(e) => set(field.key, e.target.value)} />;
            default:
              return <TextInput key={field.key} {...common} dir={field.rtl ? "rtl" : undefined} value={String(v ?? "")} onChange={(e) => set(field.key, e.target.value)} maxLength={field.max} />;
          }
        })}
      </div>
    </Modal>
  );
}
