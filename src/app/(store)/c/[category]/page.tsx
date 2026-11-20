import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { localized } from "@/i18n";
import { CatalogView } from "@/components/store/catalog-view";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    include: { subcategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const cat = await load((await params).category);
  if (!cat) return {};
  return { title: localized(cat, locale), description: cat.description ?? undefined, alternates: { canonical: `/c/${cat.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, t } = await getI18n();
  const cat = await load((await params).category);
  if (!cat) notFound();
  const name = localized(cat, locale);
  return (
    <CatalogView
      basePath={`/c/${cat.slug}`}
      searchParams={await searchParams}
      fixed={{ category: cat.slug }}
      title={name}
      description={cat.description}
      crumbs={[{ href: "/", label: t("common.home") }, { label: name }]}
      subNav={[
        { href: `/c/${cat.slug}`, label: t("common.all"), active: true },
        ...cat.subcategories.map((s) => ({ href: `/c/${cat.slug}/${s.slug}`, label: localized(s, locale) })),
      ]}
    />
  );
}
