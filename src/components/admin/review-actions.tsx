"use client";

import { useState } from "react";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import { del, put } from "@/lib/client-api";
import { ConfirmButton, Modal, Spinner, TextArea, useAction } from "./ui";

export function ReviewActions({ id, status, adminReply }: { id: string; status: string; adminReply: string | null }) {
  const { run, busy } = useAction();
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(adminReply ?? "");

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      {status !== "APPROVED" && (
        <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => run(() => put(`/api/admin/reviews/${id}`, { status: "APPROVED" }), { success: "Avis publié" })}>
          <Check className="h-3.5 w-3.5" /> Approuver
        </button>
      )}
      {status !== "REJECTED" && (
        <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => run(() => put(`/api/admin/reviews/${id}`, { status: "REJECTED" }), { success: "Avis refusé" })}>
          <X className="h-3.5 w-3.5" /> Refuser
        </button>
      )}
      <button type="button" className="a-btn a-btn-sm" onClick={() => setReplyOpen(true)}>
        <MessageSquare className="h-3.5 w-3.5" /> Répondre
      </button>
      <ConfirmButton label="Supprimer l'avis" className="a-btn a-btn-sm text-red-600" confirm="Supprimer définitivement cet avis ?" success="Avis supprimé" action={() => del(`/api/admin/reviews/${id}`)}>
        <Trash2 className="h-3.5 w-3.5" />
      </ConfirmButton>

      <Modal
        open={replyOpen}
        onClose={() => setReplyOpen(false)}
        title="Répondre à l'avis"
        size="sm"
        footer={
          <>
            <button type="button" className="a-btn" onClick={() => setReplyOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="a-btn-primary"
              disabled={busy}
              onClick={() =>
                run(() => put(`/api/admin/reviews/${id}`, { adminReply: reply }), {
                  success: "Réponse enregistrée",
                  onDone: () => setReplyOpen(false),
                })
              }
            >
              {busy && <Spinner />} Enregistrer
            </button>
          </>
        }
      >
        <TextArea label="Réponse de la boutique" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} />
      </Modal>
    </div>
  );
}
