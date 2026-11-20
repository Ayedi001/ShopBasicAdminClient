"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Field, Spinner, useToast } from "./ui";
import { tFr } from "./labels";
import { errorMessage } from "@/lib/client-api";

/** Uploads an image to /api/admin/uploads (validated and optimised server-side) and returns its URL. */
export function ImageField({ label, value, onChange, folder, error, hint }: { label: string; value: string; onChange: (url: string) => void; folder: "banners" | "categories" | "collections" | "store"; error?: string; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const r = await apiFetch<{ url: string }>("/api/admin/uploads", { method: "POST", body: form });
      onChange(r.url);
    } catch (e) {
      toast("error", errorMessage(e, tFr));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <Field label={label} error={error} hint={hint ?? "JPEG, PNG ou WebP, 8 Mo max."}>
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-neutral-300 bg-neutral-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-neutral-400" />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={(e) => (e.preventDefault(), ref.current?.click())}>
            {value ? "Remplacer" : "Téléverser"}
          </button>
          {value && (
            <button type="button" className="a-btn-ghost a-btn-sm text-red-600" onClick={(e) => (e.preventDefault(), onChange(""))}>
              <X className="h-3.5 w-3.5" /> Retirer
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}
