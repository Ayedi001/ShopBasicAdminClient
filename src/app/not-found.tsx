import Link from "next/link";
import { StoreShell } from "@/components/store/store-shell";
import { getI18n } from "@/server/i18n";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <StoreShell>
      <div className="container-x flex flex-col items-center py-28 text-center">
        <p className="font-display text-[96px] leading-none text-neutral-200">404</p>
        <h1 className="h-display mt-4 text-3xl">{t("pages.notFoundTitle")}</h1>
        <p className="mt-3 max-w-md text-ink-muted">{t("pages.notFoundText")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            {t("common.home")}
          </Link>
          <Link href="/shop" className="btn-outline">
            {t("common.shopAll")}
          </Link>
        </div>
      </div>
    </StoreShell>
  );
}
