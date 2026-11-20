"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Camera, Loader2, Star } from "lucide-react";
import type { ProductDetail } from "@/server/catalog";
import { useStore } from "./store-provider";
import { Stars } from "./product-view";
import { apiFetch, errorMessage, resolveFieldErrors, ApiError } from "@/lib/client-api";
import { formatDate, cn } from "@/lib/utils";

export function ReviewsSection({ product }: { product: ProductDetail }) {
  const { t, user, locale } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);

  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: product.reviews.filter((r) => r.rating === n).length }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rating) {
      setFields({ rating: t("err.required") });
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("rating", String(rating));
    form.delete("photos");
    files.slice(0, 4).forEach((f) => form.append("photos", f));
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await apiFetch<{ status: string }>(`/api/products/${product.id}/reviews`, { method: "POST", body: form });
      setDone(r.status === "APPROVED" ? t("product.reviewPublished") : t("product.reviewSubmitted"));
      setFormOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(resolveFieldErrors(err.fields, t));
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="reviews" className="container-x scroll-mt-24 border-t border-neutral-200 py-14">
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="h-display text-3xl">{t("product.reviews")}</h2>
          {product.ratingCount > 0 ? (
            <div className="mt-5">
              <p className="flex items-center gap-3">
                <span className="font-display text-5xl">{product.ratingAvg.toFixed(1)}</span>
                <span>
                  <Stars value={product.ratingAvg} />
                  <span className="block text-[13px] text-ink-muted">
                    {product.ratingCount} {t("product.reviews").toLowerCase()}
                  </span>
                </span>
              </p>
              <ul className="mt-5 space-y-1.5">
                {dist.map((d) => (
                  <li key={d.n} className="flex items-center gap-3 text-[13px]">
                    <span className="w-6">{d.n}★</span>
                    <span className="h-1.5 flex-1 bg-neutral-200">
                      <span className="block h-full bg-amber-500" style={{ width: `${product.reviews.length ? (d.count / product.reviews.length) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 text-end text-ink-muted">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-ink-muted">{t("product.noReviews")}</p>
          )}
          <div className="mt-6">
            {done ? (
              <p className="bg-emerald-50 p-4 text-sm text-emerald-800">{done}</p>
            ) : user ? (
              <button onClick={() => setFormOpen(!formOpen)} className="btn-outline w-full">
                {t("product.writeReview")}
              </button>
            ) : (
              <Link href={`/login?next=/p/${product.slug}%23reviews`} className="btn-outline w-full">
                {t("product.writeReview")}
              </Link>
            )}
            <p className="mt-3 text-[12px] text-ink-muted">{t("product.reviewOnlyBuyers")}</p>
          </div>
        </div>

        <div>
          {formOpen && (
            <form onSubmit={submit} className="mb-10 space-y-4 bg-paper p-6">
              <div>
                <span className="label">{t("product.yourRating")}</span>
                <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} aria-label={`${n}/5`} role="radio" aria-checked={rating === n}>
                      <Star className={cn("h-7 w-7", n <= (hover || rating) ? "fill-amber-500 text-amber-500" : "text-neutral-300")} />
                    </button>
                  ))}
                </div>
                {fields.rating && <p className="field-error">{fields.rating}</p>}
              </div>
              <div>
                <label className="label" htmlFor="rv-title">
                  {t("product.reviewTitle")} <span className="normal-case tracking-normal">({t("common.optional")})</span>
                </label>
                <input id="rv-title" name="title" maxLength={120} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="rv-body">
                  {t("product.reviewBody")}
                </label>
                <textarea id="rv-body" name="body" required minLength={10} maxLength={2000} rows={4} className={cn("input", fields.body && "input-error")} />
                {fields.body && <p className="field-error">{fields.body}</p>}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm underline underline-offset-4">
                  <Camera className="h-4 w-4" /> Photos ({files.length}/4)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []).filter((f) => f.size <= 8 * 1024 * 1024).slice(0, 4))}
                  />
                </label>
              </div>
              {error && <p className="text-sm text-sale">{error}</p>}
              <button className="btn-primary" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.send")}
              </button>
            </form>
          )}
          <ul className="divide-y divide-neutral-200">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-6 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} />
                  {r.title && <p className="font-medium">{r.title}</p>}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{r.body}</p>
                {r.photos.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {r.photos.map((ph) => (
                      <a key={ph.url} href={ph.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ph.thumbUrl} alt="" className="h-20 w-20 object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
                  <span>{r.author}</span>
                  <span>{formatDate(r.createdAt, locale)}</span>
                  {r.verified && (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" /> {t("product.verifiedPurchase")}
                    </span>
                  )}
                </p>
                {r.adminReply && (
                  <div className="mt-3 border-s-2 border-brand-accent bg-paper px-4 py-3 text-[14px]">
                    <p className="mb-1 text-[12px] font-medium uppercase tracking-wider text-ink-muted">{t("product.shopReply")}</p>
                    {r.adminReply}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
