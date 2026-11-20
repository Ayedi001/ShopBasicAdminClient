import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { localized } from "@/i18n";
import { CatalogView } from "@/components/store/catalog-view";

type Props = { params: Promise<{ category: string; sub: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(category: string, sub: string) {
  const cat = await prisma.category.findFirst({
    where: { slug: category, isActive: true },
    include: { subcategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  const current = cat?.subcategories.find((s) => s.slug === sub);
  return cat && current ? { cat, current } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const p = await params;
  const data = await load(p.category, p.sub);
  if (!data) return {};
  return { title: `${localized(data.current, locale)} — ${localized(data.cat, locale)}`, alternates: { canonical: `/c/${p.category}/${p.sub}` } };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { locale, t } = await getI18n();
  const p = await params;
  const data = await load(p.category, p.sub);
  if (!data) notFound();
  const { cat, current } = data;
  return (
    <CatalogView
      basePath={`/c/${cat.slug}/${current.slug}`}
      searchParams={await searchParams}
      fixed={{ category: cat.slug, sub: [current.slug] }}
      title={localized(current, locale)}
      crumbs={[{ href: "/", label: t("common.home") }, { href: `/c/${cat.slug}`, label: localized(cat, locale) }, { label: localized(current, locale) }]}
      subNav={[
        { href: `/c/${cat.slug}`, label: t("common.all") },
        ...cat.subcategories.map((s) => ({ href: `/c/${cat.slug}/${s.slug}`, label: localized(s, locale), active: s.id === current.id })),
      ]}
    />
  );
}
