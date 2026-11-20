"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { del, post, put } from "@/lib/client-api";
import { ConfirmButton, Modal, Select, Spinner, TextArea, TextInput, useAction } from "./ui";

type Chart = { id?: string; name: string; nameAr: string; nameEn: string; description: string; unit: string; columns: string[]; rows: { size: string; values: string[] }[]; usage?: number };

const EMPTY: Chart = {
  name: "",
  nameAr: "",
  nameEn: "",
  description: "",
  unit: "cm",
  columns: ["Poitrine", "Taille", "Hanches"],
  rows: ["S", "M", "L"].map((size) => ({ size, values: ["", "", ""] })),
};

export function SizeChartsManager({ charts }: { charts: Chart[] }) {
  const [editing, setEditing] = useState<Chart | null>(null);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" className="a-btn-primary" onClick={() => setEditing(structuredClone(EMPTY))}>
          <Plus className="h-4 w-4" /> Nouveau guide
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <section key={c.id} className="a-card">
            <header className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-semibold">{c.name}</h2>
                <p className="text-[12px] text-neutral-500">
                  Unité : {c.unit} · utilisé {c.usage} fois
                </p>
              </div>
              <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing(structuredClone(c))}>
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
              <ConfirmButton
                label="Supprimer le guide"
                className="a-btn a-btn-sm text-red-600"
                confirm="Supprimer ce guide ? Les produits et catégories qui l'utilisent n'afficheront plus de guide."
                success="Guide supprimé"
                action={() => del(`/api/admin/size-charts/${c.id}`)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmButton>
            </header>
            <div className="overflow-x-auto p-2">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Taille</th>
                    {c.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((r) => (
                    <tr key={r.size}>
                      <td className="font-medium">{r.size}</td>
                      {r.values.map((v, i) => (
                        <td key={i} className="tabular-nums">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      {editing && <ChartModal value={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ChartModal({ value, onClose }: { value: Chart; onClose: () => void }) {
  const [c, setC] = useState(value);
  const { run, busy, errors } = useAction();

  const setCol = (i: number, v: string) => setC((x) => ({ ...x, columns: x.columns.map((col, j) => (j === i ? v : col)) }));
  const addCol = () => setC((x) => ({ ...x, columns: [...x.columns, ""], rows: x.rows.map((r) => ({ ...r, values: [...r.values, ""] })) }));
  const removeCol = (i: number) => setC((x) => ({ ...x, columns: x.columns.filter((_, j) => j !== i), rows: x.rows.map((r) => ({ ...r, values: r.values.filter((_, j) => j !== i) })) }));
  const setCell = (ri: number, ci: number, v: string) => setC((x) => ({ ...x, rows: x.rows.map((r, j) => (j === ri ? { ...r, values: r.values.map((val, k) => (k === ci ? v : val)) } : r)) }));
  const setSize = (ri: number, v: string) => setC((x) => ({ ...x, rows: x.rows.map((r, j) => (j === ri ? { ...r, size: v } : r)) }));

  const save = () => {
    const body = { name: c.name, nameAr: c.nameAr || null, nameEn: c.nameEn || null, description: c.description || null, unit: c.unit, columns: c.columns, rows: c.rows };
    run(() => (c.id ? put(`/api/admin/size-charts/${c.id}`, body) : post("/api/admin/size-charts", body)), { success: "Guide enregistré", onDone: onClose });
  };
  const gridError = Object.entries(errors).find(([k]) => k.startsWith("columns") || k.startsWith("rows"))?.[1];

  return (
    <Modal
      open
      onClose={onClose}
      title={c.id ? `Modifier « ${value.name} »` : "Nouveau guide des tailles"}
      size="xl"
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
      <div className="grid gap-3 sm:grid-cols-4">
        <TextInput label="Nom (FR) *" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} error={errors.name} maxLength={100} />
        <TextInput label="Nom (AR)" dir="rtl" value={c.nameAr} onChange={(e) => setC({ ...c, nameAr: e.target.value })} maxLength={100} />
        <TextInput label="Nom (EN)" value={c.nameEn} onChange={(e) => setC({ ...c, nameEn: e.target.value })} maxLength={100} />
        <Select
          label="Unité"
          value={c.unit}
          onChange={(e) => setC({ ...c, unit: e.target.value })}
          options={[
            { value: "cm", label: "Centimètres" },
            { value: "in", label: "Pouces" },
            { value: "EU", label: "Pointure EU" },
          ]}
        />
      </div>
      <TextArea wrapClass="mt-3" label="Conseils de mesure" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} className="min-h-[50px]" maxLength={1000} />
      <div className="mt-4 overflow-x-auto">
        <table className="text-[13px]">
          <thead>
            <tr>
              <th className="p-1 text-left text-[11px] font-semibold uppercase text-neutral-500">Taille</th>
              {c.columns.map((col, i) => (
                <th key={i} className="p-1">
                  <div className="flex items-center gap-1">
                    <input className="a-input w-28 py-1 font-semibold" value={col} onChange={(e) => setCol(i, e.target.value)} placeholder="Mesure" maxLength={40} />
                    {c.columns.length > 1 && (
                      <button type="button" className="text-neutral-400 hover:text-red-600" onClick={() => removeCol(i)} aria-label="Retirer la colonne">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-1">
                {c.columns.length < 10 && (
                  <button type="button" className="a-btn a-btn-sm" onClick={addCol}>
                    <Plus className="h-3.5 w-3.5" /> Colonne
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r, ri) => (
              <tr key={ri}>
                <td className="p-1">
                  <input className="a-input w-20 py-1 font-medium" value={r.size} onChange={(e) => setSize(ri, e.target.value)} maxLength={20} />
                </td>
                {r.values.map((v, ci) => (
                  <td key={ci} className="p-1">
                    <input className="a-input w-28 py-1" value={v} onChange={(e) => setCell(ri, ci, e.target.value)} maxLength={30} placeholder="ex. 88-92" />
                  </td>
                ))}
                <td className="p-1">
                  {c.rows.length > 1 && (
                    <button type="button" className="a-btn-ghost a-btn-sm text-red-600" onClick={() => setC((x) => ({ ...x, rows: x.rows.filter((_, j) => j !== ri) }))} aria-label="Retirer la ligne">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.rows.length < 40 && (
        <button type="button" className="a-btn mt-2" onClick={() => setC((x) => ({ ...x, rows: [...x.rows, { size: "", values: x.columns.map(() => "") }] }))}>
          <Plus className="h-4 w-4" /> Ajouter une taille
        </button>
      )}
      {gridError && <p className="mt-2 text-[12px] text-red-600">Tableau : {gridError}</p>}
    </Modal>
  );
}
