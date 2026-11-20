import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { localized } from "@/i18n";
import { CatalogView } from "@/components/store/catalog-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const c = await prisma.collection.findFirst({ where: { slug: (await params).slug, isActive: true } });
  if (!c) return {};
  return { title: localized(c, locale), description: c.description ?? undefined, openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale, t } = await getI18n();
  const c = await prisma.collection.findFirst({ where: { slug: (await params).slug, isActive: true } });
  if (!c) notFound();
  const name = localized(c, locale);
  return (
    <CatalogView
      basePath={`/collections/${c.slug}`}
      searchParams={await searchParams}
      fixed={{ collection: c.slug }}
      title={name}
      description={c.description}
      crumbs={[{ href: "/", label: t("common.home") }, { href: "/collections", label: t("common.collections") }, { label: name }]}
    />
  );
}
