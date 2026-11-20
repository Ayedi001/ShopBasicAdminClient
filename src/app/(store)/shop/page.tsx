import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { getI18n } from "@/server/i18n";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { t } = await getI18n();
  const sp = await searchParams;
  return {
    title: sp.sale ? t("common.onSale") : sp.new ? t("common.newArrivals") : t("common.shopAll"),
    alternates: { canonical: "/shop" },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const title = sp.sale === "1" ? t("common.onSale") : sp.new === "1" ? t("common.newArrivals") : t("common.shopAll");
  return <CatalogView basePath="/shop" searchParams={sp} title={title} crumbs={[{ href: "/", label: t("common.home") }, { label: title }]} />;
}
