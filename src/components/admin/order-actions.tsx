"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { post, put } from "@/lib/client-api";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import { ORDER_STATUS_LABELS } from "./labels";
import { Modal, Spinner, TextArea, TextInput, fromLocalInput, toLocalInput, useAction } from "./ui";

const ACTION_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmer la commande",
  PREPARING: "Passer en préparation",
  SHIPPED: "Marquer comme expédiée",
  DELIVERED: "Marquer comme livrée",
  CANCELLED: "Annuler la commande",
};

const HELP: Record<string, string> = {
  CONFIRMED: "Confirmez seulement après avoir joint le client par téléphone. Le stock réservé sera définitivement déduit.",
  PREPARING: "Les articles sont en cours de préparation.",
  SHIPPED: "Le colis a été remis au livreur. Pensez à renseigner la société de livraison et le numéro de suivi.",
  DELIVERED: "Le client a reçu et payé sa commande. Elle sera comptée dans le chiffre d'affaires.",
  CANCELLED: "Le stock sera automatiquement remis en vente. Le client sera notifié avec le motif.",
};

export function OrderStatusActions({ orderId, status, canUpdate, canCancel }: { orderId: string; status: string; canUpdate: boolean; canCancel: boolean }) {
  const [target, setTarget] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const { run, busy, errors } = useAction();
  const next = (ORDER_TRANSITIONS[status as OrderStatus] ?? []).filter((s) => (s === "CANCELLED" ? canCancel : canUpdate));

  const submit = () =>
    run(() => post(`/api/admin/orders/${orderId}/status`, { status: target, note: note || null, cancellationReason: target === "CANCELLED" ? reason : null }), {
      success: `Statut mis à jour : ${ORDER_STATUS_LABELS[target!]}`,
      onDone: () => {
        setTarget(null);
        setNote("");
        setReason("");
      },
    });

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {next.map((s) => (
        <button key={s} type="button" className={s === "CANCELLED" ? "a-btn text-red-700" : "a-btn-primary"} onClick={() => setTarget(s)}>
          {ACTION_LABELS[s]}
        </button>
      ))}
      {!next.length && <span className="text-[13px] text-neutral-500">{status === "DELIVERED" || status === "CANCELLED" ? "Commande clôturée." : "Aucune action autorisée pour votre rôle."}</span>}
      <button type="button" className="a-btn" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimer
      </button>
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? ACTION_LABELS[target] : ""}
        size="sm"
        footer={
          <>
            <button type="button" className="a-btn" onClick={() => setTarget(null)}>
              Retour
            </button>
            <button type="button" className={target === "CANCELLED" ? "a-btn-danger" : "a-btn-primary"} disabled={busy || (target === "CANCELLED" && !reason.trim())} onClick={submit}>
              {busy && <Spinner />} Valider
            </button>
          </>
        }
      >
        <p className="mb-3 text-[13px] text-neutral-600">{target && HELP[target]}</p>
        {target === "CANCELLED" && (
          <TextArea label="Motif d'annulation *" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.cancellationReason} placeholder="Ex. : client injoignable après 3 appels, client a annulé par téléphone…" maxLength={500} />
        )}
        <TextArea wrapClass="mt-3" label="Note interne (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-[60px]" />
      </Modal>
    </div>
  );
}

export function DeliveryForm({
  orderId,
  initial,
  disabled,
}: {
  orderId: string;
  initial: { deliveryCompany: string | null; trackingNumber: string | null; deliveryNotes: string | null; deliveredAt: string | null };
  disabled: boolean;
}) {
  const [f, setF] = useState({
    deliveryCompany: initial.deliveryCompany ?? "",
    trackingNumber: initial.trackingNumber ?? "",
    deliveryNotes: initial.deliveryNotes ?? "",
    deliveredAt: toLocalInput(initial.deliveredAt),
  });
  const { run, busy, errors } = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => put(`/api/admin/orders/${orderId}/delivery`, { ...f, deliveredAt: fromLocalInput(f.deliveredAt) }), { success: "Informations de livraison enregistrées" });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Société de livraison" value={f.deliveryCompany} onChange={(e) => setF({ ...f, deliveryCompany: e.target.value })} error={errors.deliveryCompany} disabled={disabled} placeholder="Ex. : Aramex, livreur interne…" />
        <TextInput label="N° de suivi" value={f.trackingNumber} onChange={(e) => setF({ ...f, trackingNumber: e.target.value })} error={errors.trackingNumber} disabled={disabled} />
      </div>
      <TextInput label="Date de livraison" type="datetime-local" value={f.deliveredAt} onChange={(e) => setF({ ...f, deliveredAt: e.target.value })} error={errors.deliveredAt} disabled={disabled} />
      <TextArea label="Notes de livraison" value={f.deliveryNotes} onChange={(e) => setF({ ...f, deliveryNotes: e.target.value })} error={errors.deliveryNotes} disabled={disabled} className="min-h-[60px]" />
      {!disabled && (
        <button className="a-btn-primary" disabled={busy}>
          {busy && <Spinner />} Enregistrer
        </button>
      )}
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [body, setBody] = useState("");
  const { run, busy, errors } = useAction();
  return (
    <form
      className="space-y-2 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => post(`/api/admin/orders/${orderId}/notes`, { body }), { success: "Note ajoutée", onDone: () => setBody("") });
      }}
    >
      <TextArea label="Ajouter une note interne" value={body} onChange={(e) => setBody(e.target.value)} error={errors.body} className="min-h-[60px]" placeholder="Ex. : client rappelé, préfère être livré après 17h" maxLength={2000} />
      <button className="a-btn" disabled={busy || !body.trim()}>
        {busy && <Spinner />} Ajouter la note
      </button>
    </form>
  );
}
