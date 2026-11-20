"use client";

import { useState } from "react";
import { put } from "@/lib/client-api";
import { RETURN_TRANSITIONS, type ReturnStatus } from "@/lib/constants";
import { RETURN_STATUS_LABELS } from "./labels";
import { Spinner, TextArea, Toggle, useAction } from "./ui";

type Item = { id: string; label: string; quantity: number; replacementVariantId: string | null; options: { value: string; label: string; available: number }[] };

const ACTION: Record<string, string> = {
  APPROVED: "Approuver",
  REJECTED: "Refuser",
  RECEIVED: "Marquer comme reçu",
  COMPLETED: "Clôturer (terminé)",
  CANCELLED: "Annuler la demande",
};

export function ReturnActions({
  id,
  type,
  status,
  restocked,
  initial,
  items,
}: {
  id: string;
  type: string;
  status: string;
  restocked: boolean;
  initial: { adminNotes: string; rejectionReason: string; replacementNote: string };
  items: Item[];
}) {
  const [f, setF] = useState(initial);
  const [restock, setRestock] = useState(true);
  const [replacements, setReplacements] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.id, i.replacementVariantId ?? ""])));
  const { run, busy, errors } = useAction();
  const next = RETURN_TRANSITIONS[status as ReturnStatus] ?? [];
  const isExchange = type === "EXCHANGE";

  const submit = (to?: string) =>
    run(
      () =>
        put(`/api/admin/returns/${id}`, {
          status: to,
          adminNotes: f.adminNotes || null,
          rejectionReason: f.rejectionReason || null,
          replacementNote: f.replacementNote || null,
          restock: to === "RECEIVED" || to === "COMPLETED" ? restock : undefined,
          replacements: isExchange ? items.map((i) => ({ returnItemId: i.id, replacementVariantId: replacements[i.id] || null })) : undefined,
        }),
      { success: to ? `Demande : ${RETURN_STATUS_LABELS[to]}` : "Enregistré" },
    );

  const missingReplacement = isExchange && items.some((i) => !replacements[i.id]);

  return (
    <div className="space-y-4">
      {isExchange && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium">Articles de remplacement</p>
          {items.map((i) => (
            <label key={i.id} className="block">
              <span className="a-label">{i.label}</span>
              <select className="a-input" value={replacements[i.id]} onChange={(e) => setReplacements((r) => ({ ...r, [i.id]: e.target.value }))} disabled={status === "COMPLETED" || status === "CANCELLED" || status === "REJECTED"}>
                <option value="">— Choisir la variante à envoyer —</option>
                {i.options.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.available < i.quantity}>
                    {o.label}
                    {o.available < i.quantity ? " (insuffisant)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <TextArea label="Note sur le remplacement" value={f.replacementNote} onChange={(e) => setF({ ...f, replacementNote: e.target.value })} className="min-h-[50px]" maxLength={500} />
          <p className="text-[12px] text-neutral-500">À la clôture, le stock de la variante de remplacement est automatiquement déduit.</p>
        </div>
      )}
      <TextArea label="Notes internes" value={f.adminNotes} onChange={(e) => setF({ ...f, adminNotes: e.target.value })} className="min-h-[60px]" maxLength={2000} />
      {next.includes("REJECTED") && (
        <TextArea label="Motif du refus (visible par le client)" value={f.rejectionReason} onChange={(e) => setF({ ...f, rejectionReason: e.target.value })} error={errors.rejectionReason} className="min-h-[50px]" maxLength={500} />
      )}
      {(next.includes("RECEIVED") || next.includes("COMPLETED")) && !restocked && (
        <Toggle label="Remettre les articles retournés en stock" checked={restock} onChange={setRestock} hint="Décochez si l'article est abîmé et ne peut pas être revendu." />
      )}
      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
        <button type="button" className="a-btn" disabled={busy} onClick={() => submit()}>
          {busy && <Spinner />} Enregistrer les notes
        </button>
        {next.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy || (s === "REJECTED" && !f.rejectionReason.trim()) || (s === "COMPLETED" && missingReplacement)}
            className={s === "REJECTED" || s === "CANCELLED" ? "a-btn text-red-700" : "a-btn-primary"}
            onClick={() => submit(s)}
            title={s === "COMPLETED" && missingReplacement ? "Choisissez d'abord les variantes de remplacement" : undefined}
          >
            {ACTION[s]}
          </button>
        ))}
        {!next.length && <span className="self-center text-[13px] text-neutral-500">Demande clôturée.</span>}
      </div>
    </div>
  );
}
