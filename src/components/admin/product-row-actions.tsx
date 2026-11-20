"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { del, post } from "@/lib/client-api";
import { ConfirmButton, useAction, useToast } from "./ui";

export function ProductRowActions({ id, slug, name, published }: { id: string; slug: string; name: string; published: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { run, busy } = useAction();
  return (
    <div className="flex justify-end gap-1">
      <Link href={`/admin/products/${id}`} className="a-btn a-btn-sm" title="Modifier">
        <Pencil className="h-3.5 w-3.5" />
      </Link>
      {published && (
        <a href={`/p/${slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-sm" title="Voir sur la boutique">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        type="button"
        className="a-btn a-btn-sm"
        title="Dupliquer"
        disabled={busy}
        onClick={() =>
          run(() => post<{ id: string }>(`/api/admin/products/${id}/duplicate`), {
            success: "Produit dupliqué (brouillon, stock à 0)",
            refresh: false,
            onDone: (r) => router.push(`/admin/products/${r.id}`),
          })
        }
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <ConfirmButton
        label="Supprimer le produit"
        className="a-btn a-btn-sm text-red-600"
        confirm={`Supprimer « ${name} » ? S'il figure dans des commandes, il sera archivé au lieu d'être supprimé afin de conserver l'historique.`}
        action={async () => {
          const r = await del<{ archived: boolean }>(`/api/admin/products/${id}`);
          toast("ok", r.archived ? "Produit archivé (présent dans des commandes)" : "Produit supprimé");
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ConfirmButton>
    </div>
  );
}
