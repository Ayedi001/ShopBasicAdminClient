import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Info, Phone } from "lucide-react";
import { requireCustomer } from "@/server/auth/session";
import { getOwnOrder } from "@/server/account";
import { returnWindow } from "@/server/returns";
import { getI18n } from "@/server/i18n";
import { getSetting } from "@/server/settings";
import { prisma } from "@/server/db";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/utils";
import { OrderTimeline, StatusBadge } from "@/components/store/order-status";
import { ReturnRequestForm } from "@/components/store/return-request-form";

export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireCustomer();
  const { number } = await params;
  // Ownership is enforced in the query: other customers' orders are simply "not found".
  const order = await getOwnOrder(user.id, decodeURIComponent(number));
  if (!order) notFound();
  const [{ t, locale }, window, store] = await Promise.all([getI18n(), returnWindow(order), getSetting("store")]);
  const money = (m: number) => formatMoney(m, undefined, locale);
  const fmt = (d: Date | string) => formatDate(d, locale, true);

  // Sizes available for exchanges, per ordered product
  const productIds = [...new Set(order.items.map((i) => i.productId).filter(Boolean) as string[])];
  const variants = productIds.length
    ? await prisma.productVariant.findMany({
        where: { productId: { in: productIds }, isActive: true },
        select: { productId: true, colorId: true, available: true, size: { select: { label: true } }, color: { select: { name: true } } },
      })
    : [];
  const sizeOptions: Record<string, string[]> = {};
  for (const it of order.items) {
    if (!it.productId) continue;
    sizeOptions[it.id] = [
      ...new Set(variants.filter((v) => v.productId === it.productId && v.size && v.size.label !== it.sizeLabel && (!it.colorName || v.color?.name === it.colorName)).map((v) => v.size!.label)),
    ];
  }
  const openRequestItemIds = new Set(
    order.items.filter((i) => i.returnItems.some((r) => !["REJECTED", "CANCELLED"].includes(r.returnRequest.status))).map((i) => i.id),
  );
  const labels = Object.fromEntries(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => [s, t(`orderStatus.${s}`)]));

  return (
    <div className="space-y-8">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="flip-rtl h-4 w-4" /> {t("account.orders")}
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="font-mono text-2xl">{order.number}</h2>
        <StatusBadge status={order.status} label={t(`orderStatus.${order.status}`)} className="text-[13px]" />
        <span className="text-[14px] text-ink-muted">{fmt(order.createdAt)}</span>
      </div>

      {order.status === "PENDING" && (
        <p className="flex items-start gap-3 bg-amber-50 p-4 text-[14px] text-amber-900">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" /> {t("account.pendingNotice")}
        </p>
      )}

      <section className="border border-neutral-200 p-5">
        <h3 className="mb-5 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.statusHistory")}</h3>
        <OrderTimeline status={order.status} history={order.history} labels={labels} formatDate={(d) => formatDate(d, locale)} />
        {order.status === "CANCELLED" && order.cancellationReason && (
          <p className="mt-4 text-[14px]">
            <span className="text-ink-muted">{t("account.cancellationReason")} : </span>
            {order.cancellationReason}
          </p>
        )}
        {(order.deliveryCompany || order.trackingNumber) && (
          <dl className="mt-5 grid gap-1 text-[14px] sm:grid-cols-2">
            {order.deliveryCompany && (
              <div>
                <dt className="text-ink-muted">{t("account.deliveryCompany")}</dt>
                <dd>{order.deliveryCompany}</dd>
              </div>
            )}
            {order.trackingNumber && (
              <div>
                <dt className="text-ink-muted">{t("account.trackingNumber")}</dt>
                <dd className="font-mono">{order.trackingNumber}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.items")}</h3>
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 py-4 text-[14px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.imageUrl ? <img src={i.imageUrl} alt="" className="h-24 w-20 object-cover" /> : <div className="h-24 w-20 bg-neutral-100" />}
              <div className="flex-1">
                {i.productSlug ? (
                  <Link href={`/p/${i.productSlug}`} className="hover:underline">
                    {i.productName}
                  </Link>
                ) : (
                  <p>{i.productName}</p>
                )}
                <p className="text-ink-muted">{[i.colorName, i.sizeLabel].filter(Boolean).join(" · ")}</p>
                <p className="text-ink-muted">
                  {money(i.unitPrice)} × {i.quantity}
                </p>
                {i.returnItems.length > 0 && (
                  <p className="mt-1 text-[13px] text-brand-accent">
                    {t("account.request")} : {t(`returnStatus.${i.returnItems[0].returnRequest.status}`)}
                  </p>
                )}
                {order.status === "DELIVERED" && i.productSlug && (
                  <Link href={`/p/${i.productSlug}#reviews`} className="mt-1 inline-block text-[13px] underline underline-offset-4">
                    {t("account.reviewProduct")}
                  </Link>
                )}
              </div>
              <span className="font-medium">{money(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="ms-auto mt-4 max-w-xs space-y-1.5 text-[14px]">
          <div className="flex justify-between">
            <dt>{t("cart.subtotal")}</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
          {order.couponDiscount > 0 && (
            <div className="flex justify-between text-sale">
              <dt>{order.couponCode}</dt>
              <dd>-{money(order.couponDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{t("cart.shipping")}</dt>
            <dd>{order.shippingFee ? money(order.shippingFee) : t("checkout.free")}</dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-[16px] font-medium">
            <dt>{t("cart.total")}</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="bg-paper p-5 text-[14px]">
          <h3 className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em]">{t("checkout.deliverTo")}</h3>
          <p className="font-medium">{order.customerName}</p>
          <p dir="ltr" className="rtl:text-end">
            {formatPhone(order.customerPhone)}
          </p>
          {order.deliveryMethod === "PICKUP" ? (
            <p className="mt-1">{t("checkout.pickup")}</p>
          ) : (
            <p className="mt-1 text-neutral-700">
              {order.address}, {order.city} — {order.regionName}
            </p>
          )}
        </div>
        <div className="bg-paper p-5 text-[14px]">
          <h3 className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em]">{t("checkout.paymentMethod")}</h3>
          <p>{t("home.perks.payment")}</p>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="mt-3 inline-flex items-center gap-2 underline underline-offset-4">
              <Phone className="h-4 w-4" /> <span dir="ltr">{formatPhone(store.phone)}</span>
            </a>
          )}
        </div>
      </section>

      {order.returnRequests.length > 0 && (
        <section>
          <h3 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.returns")}</h3>
          <ul className="space-y-2">
            {order.returnRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border border-neutral-200 p-4 text-[14px]">
                <span className="font-mono">{r.number}</span>
                <span>{t(`account.returnTypes.${r.type}`)}</span>
                <StatusBadge status={r.status} label={t(`returnStatus.${r.status}`)} />
                <span className="text-ink-muted">{formatDate(r.createdAt, locale)}</span>
                {r.rejectionReason && <p className="w-full text-sale">{r.rejectionReason}</p>}
                {r.replacementNote && <p className="w-full text-neutral-700">{r.replacementNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.status === "DELIVERED" &&
        (window.canReturn || window.canExchange ? (
          <ReturnRequestForm
            orderNumber={order.number}
            canReturn={window.canReturn}
            canExchange={window.canExchange}
            items={order.items
              .filter((i) => !openRequestItemIds.has(i.id))
              .map((i) => ({ id: i.id, name: i.productName, detail: [i.colorName, i.sizeLabel].filter(Boolean).join(" · "), quantity: i.quantity, sizes: sizeOptions[i.id] ?? [] }))}
          />
        ) : (
          <p className="flex items-center gap-2 text-[14px] text-ink-muted">
            <Info className="h-4 w-4" /> {t("account.returnWindowClosed")}
          </p>
        ))}
    </div>
  );
}
