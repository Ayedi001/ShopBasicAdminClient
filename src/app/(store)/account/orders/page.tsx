import Link from "next/link";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/store/order-status";

const PAGE_SIZE = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireCustomer();
  const { t, locale } = await getI18n();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { select: { imageUrl: true, productName: true }, take: 4 }, _count: { select: { items: true } } },
    }),
    prisma.order.count({ where: { userId: user.id } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div>
      <h2 className="mb-5 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.orders")}</h2>
      {orders.length === 0 ? (
        <p className="text-ink-muted">{t("account.noOrders")}</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border border-neutral-200">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3 text-[13px]">
                <span>
                  <span className="text-ink-muted">{t("account.order")} </span>
                  <span className="font-mono font-medium">{o.number}</span>
                </span>
                <span className="text-ink-muted">{formatDate(o.createdAt, locale)}</span>
                <StatusBadge status={o.status} label={t(`orderStatus.${o.status}`)} />
                <span className="ms-auto font-medium">{formatMoney(o.total, undefined, locale)}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {o.items.map((i, idx) =>
                    i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={idx} src={i.imageUrl} alt={i.productName} className="h-16 w-12 border-2 border-white object-cover" />
                    ) : null,
                  )}
                </div>
                <span className="text-[13px] text-ink-muted">{t("cart.items", { n: o._count.items })}</span>
                <Link href={`/account/orders/${o.number}`} className="btn-outline btn-sm ms-auto">
                  {t("account.viewDetails")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-[14px]">
          {page > 1 ? <Link href={`?page=${page - 1}`} className="underline">{t("common.previous")}</Link> : <span />}
          <span className="text-ink-muted">{t("catalog.pageOf", { page, pages })}</span>
          {page < pages ? <Link href={`?page=${page + 1}`} className="underline">{t("common.next")}</Link> : <span />}
        </div>
      )}
    </div>
  );
}
