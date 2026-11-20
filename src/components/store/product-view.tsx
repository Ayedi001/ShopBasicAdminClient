"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Heart, Ruler, Star, Truck, RefreshCw, Banknote, Loader2 } from "lucide-react";
import type { ProductDetail } from "@/server/catalog";
import { useStore } from "./store-provider";
import { ProductGallery } from "./product-gallery";
import { SizeGuideModal } from "./size-guide";
import { QuantityStepper } from "./cart-lines";
import { Price } from "./product-card";
import { cn } from "@/lib/utils";

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-neutral-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-4 text-[13px] font-medium uppercase tracking-[0.12em]" aria-expanded={open}>
        {title}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && <div className="pb-5 text-[14px] leading-relaxed text-neutral-700">{children}</div>}
    </div>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(value) ? "fill-amber-500 text-amber-500" : "text-neutral-300")} />
      ))}
    </span>
  );
}

export function ProductView({
  product,
  deliveryText,
  returnsText,
}: {
  product: ProductDetail;
  deliveryText: string;
  returnsText: string;
}) {
  const { t, addToCart, wishlist, toggleWishlist } = useStore();
  const hasColors = product.colors.length > 0;
  const hasSizes = product.sizes.length > 0;

  const firstAvailableColor = useMemo(() => {
    if (!hasColors) return null;
    return product.colors.find((c) => product.variants.some((v) => v.colorId === c.id && v.available > 0))?.id ?? product.colors[0].id;
  }, [product, hasColors]);

  const [colorId, setColorId] = useState<string | null>(firstAvailableColor);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Deep link: ?color=slug
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("color");
    const c = product.colors.find((x) => x.slug === slug);
    if (c) setColorId(c.id);
  }, [product.colors]);

  // Single size (e.g. "TU") is auto-selected
  useEffect(() => {
    if (product.sizes.length === 1) setSizeId(product.sizes[0].id);
  }, [product.sizes]);

  const variantFor = (cId: string | null, sId: string | null) => product.variants.find((v) => v.colorId === (hasColors ? cId : null) && v.sizeId === (hasSizes ? sId : null));
  const selected = (!hasColors || colorId) && (!hasSizes || sizeId) ? variantFor(colorId, sizeId) : undefined;
  const available = selected?.available ?? 0;

  useEffect(() => {
    if (selected && qty > Math.max(1, selected.available)) setQty(Math.max(1, selected.available));
  }, [selected, qty]);

  const colorVariants = product.variants.filter((v) => !hasColors || v.colorId === colorId);
  const priceInfo = selected ?? colorVariants.reduce<(typeof product.variants)[number] | undefined>((min, v) => (!min || v.price < min.price ? v : min), undefined);
  const priceVaries = !selected && new Set(colorVariants.map((v) => v.price)).size > 1;

  const images = useMemo(() => {
    if (!hasColors || !colorId) return product.images;
    const own = product.images.filter((i) => i.colorId === colorId);
    const shared = product.images.filter((i) => !i.colorId);
    return own.length ? [...own, ...shared] : product.images;
  }, [product.images, colorId, hasColors]);

  const colorName = product.colors.find((c) => c.id === colorId)?.name;
  const sizeLabel = product.sizes.find((s) => s.id === sizeId)?.label;

  const pickColor = (id: string) => {
    setColorId(id);
    setError(null);
    const c = product.colors.find((x) => x.id === id);
    if (c) {
      const url = new URL(location.href);
      url.searchParams.set("color", c.slug);
      history.replaceState(null, "", url);
    }
    // keep size if still available in the new colour
    if (sizeId && !(variantFor(id, sizeId)?.available ?? 0)) setSizeId(product.sizes.length === 1 ? sizeId : null);
  };

  const submit = async () => {
    if (!selected) {
      setError(hasSizes && !sizeId ? t("product.chooseSize") : hasColors && !colorId ? t("product.chooseColor") : t("product.variantUnavailable"));
      return;
    }
    if (selected.available <= 0) {
      setError(t("product.variantUnavailable"));
      return;
    }
    setAdding(true);
    setError(null);
    await addToCart(selected.id, qty);
    setAdding(false);
  };

  const inWishlist = wishlist.has(product.id);
  const lowStock = selected && selected.available > 0 && selected.available <= 5;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8 lg:gap-14">
      <ProductGallery images={images} name={product.name} />

      <div className="md:sticky md:top-24 md:self-start">
        <div className="flex flex-wrap gap-2">
          {product.labels.isNew && <span className="bg-neutral-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wider">{t("common.new")}</span>}
          {product.labels.isBestSeller && <span className="bg-brand px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-white">{t("common.bestSeller")}</span>}
          {priceInfo && priceInfo.discountPct > 0 && <span className="bg-sale px-2 py-1 text-[11px] font-medium text-white">-{priceInfo.discountPct}%</span>}
        </div>
        {product.brand && <p className="eyebrow mt-4">{product.brand.name}</p>}
        <h1 className="h-display mt-2 text-3xl leading-tight lg:text-4xl">{product.name}</h1>
        {product.ratingCount > 0 && (
          <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-[13px] text-ink-muted hover:underline">
            <Stars value={product.ratingAvg} /> {product.ratingAvg.toFixed(1)} · {product.ratingCount} {t("product.reviews").toLowerCase()}
          </a>
        )}
        <div className="mt-4 text-xl">
          {priceInfo ? (
            <>
              {priceVaries && <span className="me-2 text-[14px] text-ink-muted">{t("common.from")}</span>}
              <Price price={priceInfo.price} basePrice={priceInfo.basePrice} />
              {priceInfo.discountPct > 0 && <p className="mt-1 text-[13px] text-sale">{t("product.save", { pct: priceInfo.discountPct })}{priceInfo.promotion ? ` — ${priceInfo.promotion}` : ""}</p>}
            </>
          ) : (
            <Price price={product.basePrice.final} basePrice={product.basePrice.base} />
          )}
        </div>
        {product.shortDescription && <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">{product.shortDescription}</p>}

        {hasColors && (
          <div className="mt-7">
            <p className="mb-3 text-[13px]">
              <span className="font-medium uppercase tracking-[0.12em]">{t("product.selectColor")}</span>
              {colorName && <span className="ms-2 text-ink-muted">{colorName}</span>}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((c) => {
                const soldOut = !product.variants.some((v) => v.colorId === c.id && v.available > 0);
                return (
                  <button
                    key={c.id}
                    onClick={() => pickColor(c.id)}
                    title={c.name + (soldOut ? ` — ${t("common.outOfStock")}` : "")}
                    aria-label={c.name}
                    aria-pressed={colorId === c.id}
                    className={cn("relative h-9 w-9 rounded-full p-0.5 ring-1 transition", colorId === c.id ? "ring-2 ring-brand ring-offset-2" : "ring-neutral-300 hover:ring-neutral-500")}
                  >
                    <span className="block h-full w-full rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                    {soldOut && <span className="absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-neutral-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasSizes && (
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px]">
                <span className="font-medium uppercase tracking-[0.12em]">{t("product.selectSize")}</span>
                {sizeLabel && <span className="ms-2 text-ink-muted">{sizeLabel}</span>}
              </p>
              {product.sizeChart && (
                <button onClick={() => setGuideOpen(true)} className="flex items-center gap-1.5 text-[13px] underline underline-offset-4">
                  <Ruler className="h-4 w-4" /> {t("product.sizeGuide")}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const v = variantFor(colorId, s.id);
                const avail = v?.available ?? 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!v) return;
                      setSizeId(s.id);
                      setError(null);
                    }}
                    disabled={!v}
                    aria-pressed={sizeId === s.id}
                    aria-label={avail > 0 ? s.label : t("product.sizeNotAvailable", { size: s.label })}
                    className={cn(
                      "relative min-w-[52px] border px-3 py-2.5 text-[14px] transition",
                      sizeId === s.id ? "border-brand bg-brand text-white" : "border-neutral-300 hover:border-brand",
                      avail <= 0 && "text-ink-faint line-through decoration-neutral-400",
                      !v && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 min-h-[22px] text-[13px]" aria-live="polite">
          {selected ? (
            selected.available <= 0 ? (
              <span className="text-sale">{t("common.outOfStock")}</span>
            ) : lowStock ? (
              <span className="text-amber-700">{t("common.onlyLeft", { n: selected.available })}</span>
            ) : (
              <span className="text-emerald-700">● {t("common.inStock")}</span>
            )
          ) : null}
        </div>

        <div className="mt-3 flex gap-3">
          <QuantityStepper value={qty} max={Math.max(1, Math.min(20, available || 20))} onChange={setQty} disabled={!!selected && selected.available <= 0} />
          <button onClick={submit} disabled={adding || (!!selected && selected.available <= 0)} className="btn-primary h-11 flex-1">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : selected && selected.available <= 0 ? t("common.outOfStock") : t("product.addToCart")}
          </button>
          <button
            onClick={() => toggleWishlist(product.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-300 hover:border-brand"
            aria-label={inWishlist ? t("product.removeFromWishlist") : t("product.addToWishlist")}
            aria-pressed={inWishlist}
          >
            <Heart className={cn("h-5 w-5", inWishlist && "fill-sale text-sale")} strokeWidth={1.5} />
          </button>
        </div>
        {error && (
          <p className="mt-3 text-[14px] text-sale" role="alert">
            {error}
          </p>
        )}

        <ul className="mt-7 space-y-3 border-y border-neutral-200 py-5 text-[13px] text-neutral-700">
          <li className="flex gap-3">
            <Truck className="h-4 w-4 shrink-0 text-brand-accent" /> {deliveryText}
          </li>
          <li className="flex gap-3">
            <Banknote className="h-4 w-4 shrink-0 text-brand-accent" /> {t("product.paymentInfo")}
          </li>
          <li className="flex gap-3">
            <RefreshCw className="h-4 w-4 shrink-0 text-brand-accent" /> {returnsText}
          </li>
        </ul>

        <div className="mt-2">
          <Accordion title={t("product.description")} defaultOpen>
            <p className="whitespace-pre-line">{product.description}</p>
          </Accordion>
          {(product.materials.length > 0 || product.careInstructions) && (
            <Accordion title={`${t("product.composition")} & ${t("product.care").toLowerCase()}`}>
              {product.materials.length > 0 && (
                <ul className="mb-3">
                  {product.materials.map((m) => (
                    <li key={m.name}>
                      {m.percentage}% {m.name}
                    </li>
                  ))}
                </ul>
              )}
              {product.careInstructions && <p className="whitespace-pre-line">{product.careInstructions}</p>}
            </Accordion>
          )}
          {product.characteristics.length > 0 && (
            <Accordion title={t("product.characteristics")}>
              <ul className="list-disc space-y-1 ps-5">
                {product.characteristics.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Accordion>
          )}
          <Accordion title={t("product.details")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
              {(selected?.sku || product.sku) && (
                <>
                  <dt className="text-ink-muted">{t("product.reference")}</dt>
                  <dd>{selected?.sku ?? product.sku}</dd>
                </>
              )}
              {product.brand && (
                <>
                  <dt className="text-ink-muted">{t("product.brand")}</dt>
                  <dd>{product.brand.name}</dd>
                </>
              )}
              {product.fitType && (
                <>
                  <dt className="text-ink-muted">{t("product.fit")}</dt>
                  <dd>{t(`fit.${product.fitType}`)}</dd>
                </>
              )}
              <dt className="text-ink-muted">{t("product.season")}</dt>
              <dd>{t(`season.${product.season}`)}</dd>
              {product.countryOfOrigin && (
                <>
                  <dt className="text-ink-muted">{t("product.origin")}</dt>
                  <dd>{product.countryOfOrigin}</dd>
                </>
              )}
              {product.weightGrams && (
                <>
                  <dt className="text-ink-muted">{t("product.weight")}</dt>
                  <dd>{product.weightGrams} g</dd>
                </>
              )}
            </dl>
          </Accordion>
        </div>
      </div>
      {product.sizeChart && <SizeGuideModal chart={product.sizeChart} open={guideOpen} onClose={() => setGuideOpen(false)} highlight={sizeLabel} />}
    </div>
  );
}
