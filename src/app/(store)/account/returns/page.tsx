import Link from "next/link";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/store/order-status";

export default async function ReturnsPage() {
  const user = await requireCustomer();
  const { t, locale } = await getI18n();
  const requests = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { number: true } }, items: { include: { orderItem: { select: { productName: true, sizeLabel: true, colorName: true } } } } },
  });
  return (
    <div>
      <h2 className="mb-5 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.returns")}</h2>
      {requests.length === 0 ? (
        <p className="text-ink-muted">{t("account.noReturns")}</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} className="border border-neutral-200 p-5 text-[14px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono font-medium">{r.number}</span>
                <span>{t(`account.returnTypes.${r.type}`)}</span>
                <StatusBadge status={r.status} label={t(`returnStatus.${r.status}`)} />
                <span className="text-ink-muted">{formatDate(r.createdAt, locale)}</span>
                <Link href={`/account/orders/${r.order.number}`} className="ms-auto underline underline-offset-4">
                  {r.order.number}
                </Link>
              </div>
              <p className="mt-2 text-ink-muted">
                {t("account.reason")} : {t(`returnReason.${r.reason}`)}
              </p>
              <ul className="mt-2 list-disc ps-5">
                {r.items.map((i) => (
                  <li key={i.id}>
                    {i.orderItem.productName} ({[i.orderItem.colorName, i.orderItem.sizeLabel].filter(Boolean).join(" · ")}) × {i.quantity}
                    {i.requestedSize && ` → ${i.requestedSize}`}
                    {i.replacementLabel && <span className="text-emerald-700"> ✓ {i.replacementLabel}</span>}
                  </li>
                ))}
              </ul>
              {r.rejectionReason && <p className="mt-2 text-sale">{r.rejectionReason}</p>}
              {r.replacementNote && (
                <p className="mt-2 bg-paper p-3">
                  <span className="text-ink-muted">{t("account.adminReply")} : </span>
                  {r.replacementNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
