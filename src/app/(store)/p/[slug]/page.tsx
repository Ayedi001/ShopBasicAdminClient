import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getProductDetail, getRelated } from "@/server/catalog";
import { ensurePricingFresh } from "@/server/pricing";
import { getI18n } from "@/server/i18n";
import { getAllSettings } from "@/server/settings";
import { formatMoney } from "@/lib/money";
import { Breadcrumbs } from "@/components/store/catalog-view";
import { ProductView } from "@/components/store/product-view";
import { ReviewsSection } from "@/components/store/reviews";
import { ProductRail } from "@/components/store/product-card";
import { RecentlyViewed, TrackRecentlyViewed } from "@/components/store/recently-viewed";

type Props = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => {
  await ensurePricingFresh();
  const { locale } = await getI18n();
  return getProductDetail(slug, locale);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Produit introuvable" };
  const image = p.images.find((i) => i.kind === "IMAGE");
  const description = (p.metaDescription || p.shortDescription || p.description).slice(0, 160);
  return {
    title: p.metaTitle || p.name,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", images: image ? [{ url: image.url, alt: image.alt }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await load((await params).slug);
  if (!product) notFound();
  const [{ t, locale, currency }, settings, related] = await Promise.all([getI18n(), getAllSettings(), getRelated(product, (await getI18n()).locale)]);
  const { delivery, general, store } = settings;

  const deliveryText = t("product.deliveryInfo", {
    time: delivery.estimatedDelivery,
    amount: formatMoney(delivery.freeShippingThreshold, currency, locale),
  });
  const returnsText = t("product.returnsInfo", { days: general.exchangePeriodDays });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const prices = product.variants.map((v) => v.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : { "@type": "Brand", name: store.name },
    image: product.images.filter((i) => i.kind === "IMAGE").slice(0, 6).map((i) => new URL(i.url, appUrl).toString()),
    category: [product.category.name, product.subcategory?.name].filter(Boolean).join(" > "),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "TND",
      lowPrice: ((prices.length ? Math.min(...prices) : product.basePrice.final) / 1000).toFixed(3),
      highPrice: ((prices.length ? Math.max(...prices) : product.basePrice.final) / 1000).toFixed(3),
      offerCount: product.variants.length || 1,
      availability: product.variants.some((v) => v.available > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${appUrl}/p/${product.slug}`,
    },
    ...(product.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount } } : {}),
  };

  const crumbs = [
    { href: "/", label: t("common.home") },
    { href: `/c/${product.category.slug}`, label: product.category.name },
    ...(product.subcategory ? [{ href: `/c/${product.category.slug}/${product.subcategory.slug}`, label: product.subcategory.name }] : []),
    { label: product.name },
  ];

  const rails = [
    { title: t("product.complementary"), items: related.complementary },
    { title: t("product.sameCollection"), items: related.sameCollection },
    { title: t("product.similar"), items: related.similar },
  ].filter((r) => r.items.length > 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackRecentlyViewed productId={product.id} />
      <div className="container-x pb-6 pt-4 lg:pt-6">
        <div className="mb-5 hidden lg:block">
          <Breadcrumbs items={crumbs} />
        </div>
        <ProductView product={product} deliveryText={deliveryText} returnsText={returnsText} />
      </div>
      <ReviewsSection product={product} />
      {rails.map((r) => (
        <section key={r.title} className="container-x py-12">
          <h2 className="h-display mb-6 text-3xl">{r.title}</h2>
          <ProductRail products={r.items.slice(0, 4)} />
        </section>
      ))}
      <RecentlyViewed title={t("common.recentlyViewed")} excludeId={product.id} />
    </>
  );
}
