import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getOwnOrder } from "@/server/account";
import { getI18n } from "@/server/i18n";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Commande envoyée", robots: { index: false } };

export default async function SuccessPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { number } = await params;
  const order = await getOwnOrder(user.id, number);
  if (!order) notFound();
  const { t, locale } = await getI18n();
  const money = (m: number) => formatMoney(m, undefined, locale);
  return (
    <div className="container-x flex justify-center py-14">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" strokeWidth={1.3} />
          <h1 className="h-display mt-5 text-4xl">{t("success.title")}</h1>
          <p className="mt-4 text-ink-muted">{t("success.number")}</p>
          <p className="mt-1 font-mono text-2xl tracking-wider">{order.number}</p>
          <p className="mx-auto mt-5 max-w-lg text-neutral-700">{t("success.text", { phone: formatPhone(order.customerPhone) })}</p>
        </div>
        <div className="mt-10 bg-paper p-6">
          <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.14em]">{t("success.steps")}</h2>
          <ol className="space-y-3 text-[15px]">
            {[t("success.step1"), t("success.step2"), t("success.step3")].map((s, i) => (
              <li key={s} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] text-white">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <ul className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4 text-[14px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.imageUrl && <img src={i.imageUrl} alt="" className="h-20 w-16 object-cover" />}
              <div className="flex-1">
                <p>{i.productName}</p>
                <p className="text-ink-muted">
                  {[i.colorName, i.sizeLabel].filter(Boolean).join(" · ")} × {i.quantity}
                </p>
              </div>
              <span>{money(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 text-[14px]">
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
          <div className="flex justify-between text-[17px] font-medium">
            <dt>{t("cart.total")}</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={`/account/orders/${order.number}`} className="btn-primary">
            {t("success.viewOrder")}
          </Link>
          <Link href="/shop" className="btn-outline">
            {t("common.continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
