import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/store/order-status";

export default async function AccountOverview() {
  const user = await requireCustomer();
  const { t, locale } = await getI18n();
  const [orders, profile, counts] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, include: { _count: { select: { items: true } } } }),
    prisma.customerProfile.findUnique({ where: { userId: user.id }, include: { region: true } }),
    prisma.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
  ]);
  const total = counts.reduce((s, c) => s + c._count, 0);
  const active = counts.filter((c) => !["DELIVERED", "CANCELLED"].includes(c.status)).reduce((s, c) => s + c._count, 0);
  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-paper p-5">
          <p className="eyebrow">{t("account.orders")}</p>
          <p className="mt-2 font-display text-4xl">{total}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="eyebrow">{t("orderStatus.PENDING")} / {t("orderStatus.SHIPPED")}</p>
          <p className="mt-2 font-display text-4xl">{active}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="eyebrow">{t("account.deliveryAddress")}</p>
          <p className="mt-2 text-[14px] text-neutral-700">
            {profile?.address ? (
              <>
                {profile.address}, {profile.city}
                {profile.region ? ` — ${profile.region.name}` : ""}
              </>
            ) : (
              <Link href="/account/profile" className="underline">
                {t("common.edit")}
              </Link>
            )}
          </p>
        </div>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.recentOrders")}</h2>
          <Link href="/account/orders" className="flex items-center gap-1 text-[13px] underline underline-offset-4">
            {t("common.viewAll")} <ArrowRight className="flip-rtl h-3.5 w-3.5" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center border border-dashed border-neutral-300 py-12 text-center">
            <Package className="h-8 w-8 text-ink-faint" strokeWidth={1.3} />
            <p className="mt-3 text-ink-muted">{t("account.noOrders")}</p>
            <Link href="/shop" className="btn-primary mt-5">
              {t("common.shopAll")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-4 hover:bg-neutral-50">
                  <span className="font-mono text-[14px]">{o.number}</span>
                  <span className="text-[13px] text-ink-muted">{formatDate(o.createdAt, locale)}</span>
                  <StatusBadge status={o.status} label={t(`orderStatus.${o.status}`)} />
                  <span className="ms-auto text-[14px] font-medium">{formatMoney(o.total, undefined, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="text-[14px] text-ink-muted">
        <p>
          {user.email} · <span dir="ltr">{formatPhone(user.phone)}</span>
        </p>
      </section>
    </div>
  );
}
