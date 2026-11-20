"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { del, patch } from "@/lib/client-api";
import { ConfirmButton, useAction } from "./ui";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function MessagesClient({ messages: initial }: { messages: Msg[] }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const { run, busy } = useAction();

  const openMsg = async (m: Msg) => {
    setOpen(m.id);
    if (!m.isRead) {
      await run(() => patch(`/api/admin/messages/${m.id}`), { success: undefined, refresh: true });
      setItems((list) => list.map((x) => (x.id === m.id ? { ...x, isRead: true } : x)));
    }
  };

  return (
    <ul className="divide-y divide-neutral-100">
      {items.map((m) => {
        const expanded = open === m.id;
        return (
          <li key={m.id} className={cn(!m.isRead && "bg-amber-50/40")}>
            <button type="button" className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50" onClick={() => openMsg(m)} disabled={busy}>
              {!m.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={cn("text-[13px]", !m.isRead ? "font-semibold" : "font-medium")}>{m.subject}</p>
                  <time className="text-[12px] text-neutral-500">{new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</time>
                </div>
                <p className="text-[12px] text-neutral-600">
                  {m.name}
                  {m.email ? ` · ${m.email}` : ""}
                  {m.phone ? ` · ${m.phone}` : ""}
                </p>
                {!expanded && <p className="mt-0.5 line-clamp-1 text-[12px] text-neutral-500">{m.message}</p>}
              </div>
            </button>
            {expanded && (
              <div className="space-y-3 border-t border-neutral-100 bg-white px-4 py-3">
                <p className="whitespace-pre-wrap text-[13px] text-neutral-800">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="a-btn a-btn-sm">
                      Appeler
                    </a>
                  )}
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="a-btn a-btn-sm">
                      Répondre par e-mail
                    </a>
                  )}
                  <ConfirmButton
                    label="Supprimer le message"
                    className="a-btn a-btn-sm text-red-600"
                    confirm="Supprimer définitivement ce message ?"
                    success="Message supprimé"
                    action={() => del(`/api/admin/messages/${m.id}`)}
                    onDone={() => setItems((list) => list.filter((x) => x.id !== m.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </ConfirmButton>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
