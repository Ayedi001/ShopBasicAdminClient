import Link from "next/link";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { getCardsByIds } from "@/server/catalog";
import { ProductGrid } from "@/components/store/product-card";

export default async function WishlistPage() {
  const user = await requireCustomer();
  const { t, locale } = await getI18n();
  const items = await prisma.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { productId: true } });
  const cards = await getCardsByIds(
    items.map((i) => i.productId),
    locale,
  );
  return (
    <div>
      <h2 className="mb-5 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.wishlist")}</h2>
      {cards.length === 0 ? (
        <div className="py-10">
          <p className="text-ink-muted">{t("account.wishlistEmpty")}</p>
          <Link href="/shop" className="btn-primary mt-5">
            {t("common.shopAll")}
          </Link>
        </div>
      ) : (
        <ProductGrid products={cards} />
      )}
    </div>
  );
}
