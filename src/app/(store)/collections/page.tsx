import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { localized } from "@/i18n";
import { SafeImage } from "@/components/store/safe-image";
import { Breadcrumbs } from "@/components/store/catalog-view";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const { locale, t } = await getI18n();
  const collections = await prisma.collection.findMany({
    where: { isActive: true, products: { some: { status: "PUBLISHED" } } },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
  });
  return (
    <div className="container-x pb-10 pt-6">
      <Breadcrumbs items={[{ href: "/", label: t("common.home") }, { label: t("common.collections") }]} />
      <h1 className="h-display mb-8 mt-4 text-4xl lg:text-5xl">{t("home.collectionsTitle")}</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {collections.map((c) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group block">
            <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
              <SafeImage src={c.imageUrl} alt={localized(c, locale)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <h2 className="h-display text-3xl">{localized(c, locale)}</h2>
              <span className="text-sm text-ink-muted">{t("catalog.products", { n: c._count.products })}</span>
            </div>
            {c.description && <p className="mt-1 text-ink-muted">{c.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
