"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { useStore } from "./store-provider";
import { apiFetch } from "@/lib/client-api";
import { SafeImage } from "./safe-image";
import { Price } from "./product-card";

type Suggestion = {
  products: { slug: string; name: string; image: string | null; price: number; basePrice: number }[];
  categories: { label: string; href: string }[];
  total: number;
};

/** Full-width search panel with as-you-type suggestions. */
export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setData(await apiFetch<Suggestion>(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal }));
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("common.search")}>
      <div className="absolute inset-0 animate-fadeIn bg-black/30" onClick={onClose} />
      <div className="relative animate-slideUp bg-white shadow-xl">
        <form onSubmit={submit} className="container-x flex items-center gap-3 py-4 sm:py-6">
          <Search className="h-5 w-5 shrink-0 text-ink-muted" strokeWidth={1.6} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="w-full bg-transparent py-2 text-lg outline-none placeholder:text-ink-faint sm:text-2xl"
            aria-label={t("common.search")}
            autoComplete="off"
            enterKeyHint="search"
          />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />}
          {q && (
            <button type="button" onClick={() => setQ("")} className="p-2 text-ink-muted hover:text-ink" aria-label={t("common.clear")}>
              <X className="h-5 w-5" />
            </button>
          )}
          <button type="button" onClick={onClose} className="hidden text-[13px] uppercase tracking-wider text-ink-muted hover:text-ink sm:block">
            {t("common.close")}
          </button>
        </form>
        {data && (
          <div className="container-x max-h-[70vh] overflow-y-auto border-t border-neutral-100 pb-6 pt-4">
            {data.products.length === 0 && data.categories.length === 0 ? (
              <p className="py-6 text-center text-ink-muted">{t("catalog.noResults")}</p>
            ) : (
              <div className="grid gap-8 md:grid-cols-[1fr_3fr]">
                {data.categories.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3">{t("catalog.categoriesMatch")}</p>
                    <ul className="space-y-2">
                      {data.categories.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} onClick={onClose} className="hover:underline">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.products.length > 0 && (
                  <div className={data.categories.length ? "" : "md:col-span-2"}>
                    <p className="eyebrow mb-3">{t("catalog.suggestions")}</p>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {data.products.map((p) => (
                        <li key={p.slug}>
                          <Link href={`/p/${p.slug}`} onClick={onClose} className="flex items-center gap-3 p-1 hover:bg-neutral-50">
                            <SafeImage src={p.image} alt={p.name} className="h-16 w-14 shrink-0 object-cover" />
                            <span className="min-w-0 text-sm">
                              <span className="line-clamp-2">{p.name}</span>
                              <Price price={p.price} basePrice={p.basePrice} className="text-ink-muted" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <button onClick={submit} className="link-underline mt-5 text-sm font-medium">
                      {t("catalog.viewAllResults")} ({data.total})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
