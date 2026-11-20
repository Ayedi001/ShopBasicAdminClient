"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import type { ProductCardDTO } from "@/server/catalog";
import { useStore } from "./store-provider";
import { SafeImage, mediaSrcSet } from "./safe-image";
import { cn } from "@/lib/utils";

export function Price({ price, basePrice, className }: { price: number; basePrice?: number; className?: string }) {
  const { money } = useStore();
  const discounted = basePrice != null && basePrice > price;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn(discounted && "text-sale")}>{money(price)}</span>
      {discounted && <s className="text-[0.9em] text-ink-faint">{money(basePrice)}</s>}
    </span>
  );
}

export function ProductCard({ product, priority }: { product: ProductCardDTO; priority?: boolean }) {
  const { t, wishlist, toggleWishlist } = useStore();
  const inWishlist = wishlist.has(product.id);
  const href = product.href;
  return (
    <article className="group relative flex flex-col">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-neutral-100">
        <SafeImage
          src={product.image}
          srcSet={mediaSrcSet(product.image)}
          sizes="(min-width:1024px) 25vw, 50vw"
          alt={product.name}
          eager={priority}
          className={cn("h-full w-full object-cover transition duration-500", product.hoverImage && "group-hover:opacity-0")}
        />
        {product.hoverImage && (
          <SafeImage
            src={product.hoverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
          />
        )}
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {product.discountPct > 0 && <span className="bg-sale px-2 py-0.5 text-[11px] font-medium text-white">-{product.discountPct}%</span>}
          {product.isNew && <span className="bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider">{t("common.new")}</span>}
          {!product.isNew && product.isBestSeller && (
            <span className="bg-brand px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">{t("common.bestSeller")}</span>
          )}
        </div>
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-white/90 py-1.5 text-center text-[12px] uppercase tracking-wider text-ink-muted">
            {t("common.outOfStock")}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={inWishlist ? t("product.removeFromWishlist") : t("product.addToWishlist")}
        aria-pressed={inWishlist}
        className="absolute end-2 top-2 rounded-full bg-white/90 p-2 transition hover:bg-white"
      >
        <Heart className={cn("h-4 w-4", inWishlist && "fill-current text-sale")} strokeWidth={1.6} />
      </button>
      <div className="mt-3 flex flex-1 flex-col gap-1 text-[14px]">
        {product.brand && <span className="text-[11px] uppercase tracking-wider text-ink-muted">{product.brand}</span>}
        <Link href={href} className="line-clamp-2 leading-snug hover:underline">
          {product.name}
        </Link>
        <Price price={product.price} basePrice={product.basePrice} className="font-medium" />
        <div className="mt-1 flex items-center justify-between gap-2">
          {product.colors.length > 0 && (
            <div className="flex items-center gap-1" aria-label={product.colors.map((c) => c.name).join(", ")}>
              {product.colors.slice(0, 5).map((c) => (
                <span key={c.slug} title={c.name} className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex }} />
              ))}
              {product.colors.length > 5 && <span className="text-[11px] text-ink-muted">+{product.colors.length - 5}</span>}
            </div>
          )}
          {product.ratingCount > 0 && (
            <span className="flex items-center gap-0.5 text-[12px] text-ink-muted">
              <Star className="h-3 w-3 fill-current text-amber-500" />
              {product.ratingAvg.toFixed(1)} ({product.ratingCount})
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardDTO[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: ProductCardDTO[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[46vw] shrink-0 snap-start sm:w-[34vw] lg:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
