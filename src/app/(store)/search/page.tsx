import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { getI18n } from "@/server/i18n";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { t } = await getI18n();
  const q = String((await searchParams).q ?? "").slice(0, 100);
  return { title: q ? t("catalog.resultsFor", { q }) : t("common.search"), robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const q = String(sp.q ?? "").slice(0, 100).trim();
  const title = q ? t("catalog.resultsFor", { q }) : t("common.shopAll");
  return <CatalogView basePath="/search" searchParams={sp} title={title} crumbs={[{ href: "/", label: t("common.home") }, { label: t("common.search") }]} />;
}
