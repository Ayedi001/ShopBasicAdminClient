"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { put } from "@/lib/client-api";
import { Card } from "./parts";
import { Spinner, TextArea, TextInput, useAction } from "./ui";
import { cn } from "@/lib/utils";

export function ContentPagesEditor({
  slug,
  locale,
  slugs,
  locales,
  labels,
  initial,
}: {
  slug: string;
  locale: string;
  slugs: string[];
  locales: string[];
  labels: { pages: Record<string, string>; locales: Record<string, string> };
  initial: { title: string; body: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const { run, busy, errors } = useAction();

  useEffect(() => {
    setTitle(initial.title);
    setBody(initial.body);
  }, [initial.title, initial.body, slug, locale]);

  const go = (s: string, l: string) => router.push(`/admin/pages?slug=${s}&locale=${l}`);

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1 border-b border-neutral-200">
        {slugs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s, locale)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[13px]", slug === s ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}
          >
            {labels.pages[s] ?? s}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-1">
        {locales.map((l) => (
          <button key={l} type="button" onClick={() => go(slug, l)} className={cn("rounded-md px-3 py-1.5 text-[12px]", locale === l ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>
            {labels.locales[l] ?? l}
          </button>
        ))}
      </div>
      <Card title={`${labels.pages[slug] ?? slug} · ${labels.locales[locale] ?? locale}`}>
        <div className="space-y-3">
          <TextInput label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} dir={locale === "ar" ? "rtl" : "ltr"} maxLength={150} />
          <TextArea label="Contenu (Markdown) *" value={body} onChange={(e) => setBody(e.target.value)} error={errors.body} dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-[320px] font-mono text-[13px]" maxLength={30000} />
          <div className="flex justify-end">
            <button type="button" className="a-btn-primary" disabled={busy} onClick={() => run(() => put(`/api/admin/pages/${slug}/${locale}`, { title, body }), { success: "Page enregistrée" })}>
              {busy && <Spinner />} Enregistrer
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
