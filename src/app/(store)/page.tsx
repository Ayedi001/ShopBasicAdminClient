import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { getNavigation, getProductCards, type ProductCardDTO } from "@/server/catalog";
import { ensurePricingFresh } from "@/server/pricing";
import { localized, localizedField } from "@/i18n";
import { safeHref, safeJson } from "@/lib/utils";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { ProductRail } from "@/components/store/product-card";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { SafeImage } from "@/components/store/safe-image";
import { Perks } from "@/components/store/footer";

export const dynamic = "force-dynamic";

function SectionHeader({ title, subtitle, href, cta }: { title: string; subtitle?: string | null; href?: string; cta?: string }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div>
        <h2 className="h-display text-3xl sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="group hidden shrink-0 items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] sm:flex">
          {cta} <ArrowRight className="flip-rtl h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  await ensurePricingFresh();
  const { locale, t } = await getI18n();
  const now = new Date();
  const [sections, banners, nav, collections] = await Promise.all([
    prisma.homeSection.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.banner.findMany({
      where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      orderBy: { sortOrder: "asc" },
    }),
    getNavigation(locale),
    prisma.collection.findMany({ where: { isActive: true, isFeatured: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
  ]);

  const field = (b: { [k: string]: unknown }, base: string) =>
    localizedField(b[base] as string | null, b[`${base}Ar`] as string | null, b[`${base}En`] as string | null, locale);

  const blocks = await Promise.all(
    sections.map(async (s) => {
      const config = safeJson<{ limit?: number; link?: string; cta?: string }>(s.config, {});
      const title = localizedField(s.title, s.titleAr, s.titleEn, locale);
      const subtitle = localizedField(s.subtitle, s.subtitleAr, s.subtitleEn, locale) || null;
      const limit = Math.min(4, config.limit ?? 4);
      const rail = async (cards: Promise<ProductCardDTO[]>, href: string, fallbackTitle: string) => {
        const items = await cards;
        if (!items.length) return null;
        return (
          <section key={s.id} className="container-x py-10 lg:py-12">
            <SectionHeader title={title || fallbackTitle} subtitle={subtitle} href={href} cta={t("common.viewAll")} />
            <ProductRail products={items.slice(0, limit)} />
            <Link href={href} className="btn-outline mt-6 w-full sm:hidden">
              {t("common.viewAll")}
            </Link>
          </section>
        );
      };

      switch (s.type) {
        case "HERO": {
          const slides = banners
            .filter((b) => b.placement === "HERO")
            .map((b) => ({ id: b.id, title: field(b, "title"), subtitle: field(b, "subtitle") || null, cta: field(b, "ctaLabel") || null, href: safeHref(b.linkUrl), image: b.imageUrl }));
          return slides.length ? <HeroCarousel key={s.id} slides={slides} /> : null;
        }
        case "CATEGORY_TILES":
          return (
            <section key={s.id} className="container-x py-12 lg:py-16">
              {title && <SectionHeader title={title} subtitle={subtitle} />}
              <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
                {nav.map((c) => (
                  <Link key={c.slug} href={`/c/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-neutral-100 sm:aspect-[3/4]">
                    <SafeImage src={c.imageUrl} alt={c.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <p className="h-display text-4xl">{c.name}</p>
                      <span className="mt-2 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em]">
                        {t("home.shopNow")} <ArrowRight className="flip-rtl h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        case "NEW_ARRIVALS":
          return rail(
            getProductCards({ isNewArrival: true }, locale, { orderBy: [{ publishedAt: "desc" }], take: limit }),
            "/shop?new=1&sort=newest",
            t("home.newInTitle"),
          );
        case "BEST_SELLERS":
          return rail(
            getProductCards({}, locale, { orderBy: [{ soldCount: "desc" }, { isBestSeller: "desc" }], take: limit }),
            "/shop?sort=bestsellers",
            t("home.bestTitle"),
          );
        case "ON_SALE":
          return rail(
            getProductCards({ isDiscounted: true, totalAvailable: { gt: 0 } }, locale, { orderBy: [{ maxDiscountPct: "desc" }], take: limit }),
            "/shop?sale=1",
            t("home.saleTitle"),
          );
        case "FEATURED":
          return rail(getProductCards({ isFeatured: true }, locale, { orderBy: [{ publishedAt: "desc" }], take: limit }), "/shop", t("home.featuredTitle"));
        case "COLLECTIONS":
          if (!collections.length) return null;
          return (
            <section key={s.id} className="container-x py-12 lg:py-16">
              <SectionHeader title={title || t("home.collectionsTitle")} subtitle={subtitle} href="/collections" cta={t("common.viewAll")} />
              <div className="grid gap-5 md:grid-cols-3">
                {collections.slice(0, 3).map((c, i) => (
                  <Link key={c.id} href={`/collections/${c.slug}`} className={`group relative block overflow-hidden bg-neutral-100 ${i === 0 ? "aspect-[4/5] md:row-span-2 md:aspect-auto" : "aspect-[4/3]"}`}>
                    <SafeImage src={c.imageUrl} alt={localized(c, locale)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <p className="h-display text-3xl lg:text-4xl">{localized(c, locale)}</p>
                      {c.description && locale === "fr" && <p className="mt-1 line-clamp-2 max-w-sm text-sm text-white/85">{c.description}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        case "PROMO_TEXT": {
          if (!title) return null;
          return (
            <section key={s.id} className="py-4">
              <div className="bg-brand-soft">
                <div className="container-x flex flex-col items-center gap-2.5 py-10 text-center">
                  <h2 className="h-display text-2xl sm:text-3xl">{title}</h2>
                  {subtitle && <p className="max-w-xl text-sm text-ink-muted">{subtitle}</p>}
                  {config.link && (
                    <Link href={safeHref(config.link)} className="link-underline mt-1 text-[13px] font-medium uppercase tracking-[0.12em]">
                      {config.cta || t("home.shopNow")}
                    </Link>
                  )}
                </div>
              </div>
            </section>
          );
        }
        case "RECENTLY_VIEWED":
          return <RecentlyViewed key={s.id} title={title || t("common.recentlyViewed")} />;
        default:
          return null;
      }
    }),
  );

  return (
    <>
      {blocks}
      <Perks t={t} />
    </>
  );
}
