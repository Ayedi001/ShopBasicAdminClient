import Link from "next/link";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { formatDate, safeHref } from "@/lib/utils";
import { MarkAllRead } from "@/components/store/mark-all-read";

export default async function NotificationsPage() {
  const user = await requireCustomer();
  const { t, locale } = await getI18n();
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = items.filter((i) => !i.readAt).length;
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">
          {t("account.notifications")} {unread > 0 && <span className="text-ink-muted">· {t("account.unread", { n: unread })}</span>}
        </h2>
        {unread > 0 && <MarkAllRead />}
      </div>
      {items.length === 0 ? (
        <p className="text-ink-muted">{t("account.noNotifications")}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {items.map((n) => (
            <li key={n.id} className={`flex gap-4 px-2 py-4 text-[14px] ${n.readAt ? "" : "bg-brand-soft/60"}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand-accent"}`} />
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-neutral-700">{n.body}</p>
                <p className="mt-1 text-[12px] text-ink-muted">{formatDate(n.createdAt, locale, true)}</p>
              </div>
              {n.link && (
                <Link href={safeHref(n.link)} className="self-center text-[13px] underline underline-offset-4">
                  {t("account.viewDetails")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
