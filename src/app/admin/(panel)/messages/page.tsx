import Link from "next/link";
import { adminPage } from "@/server/admin-guard";
import { prisma, icontains } from "@/server/db";
import { Card, Empty, PageHeader, Pagination } from "@/components/admin/parts";
import { MessagesClient } from "@/components/admin/messages-client";

const PAGE_SIZE = 25;

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ q?: string; unread?: string; page?: string }> }) {
  await adminPage("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const unreadOnly = sp.unread === "1";
  const where = {
    ...(unreadOnly ? { isRead: false } : {}),
    ...(q
      ? {
          OR: [{ name: icontains(q) }, { email: icontains(q) }, { phone: icontains(q) }, { subject: icontains(q) }, { message: icontains(q) }],
        }
      : {}),
  };
  const [messages, total, unread] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);

  return (
    <>
      <PageHeader title="Messages" description={`${unread} non lu(s) · ${total} résultat(s)`} />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/messages">
          <label className="min-w-[220px] flex-1">
            <span className="a-label">Recherche</span>
            <input name="q" defaultValue={sp.q} className="a-input" placeholder="Nom, e-mail, sujet…" />
          </label>
          <label className="flex items-center gap-2 pb-2 text-[13px]">
            <input type="checkbox" name="unread" value="1" defaultChecked={unreadOnly} className="accent-neutral-900" />
            Non lus seulement
          </label>
          <button className="a-btn-primary">Filtrer</button>
          {(q || unreadOnly) && (
            <Link href="/admin/messages" className="a-btn-ghost">
              Réinitialiser
            </Link>
          )}
        </form>
        {messages.length ? (
          <MessagesClient
            messages={messages.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              phone: m.phone,
              subject: m.subject,
              message: m.message,
              isRead: m.isRead,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        ) : (
          <Empty>Aucun message.</Empty>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/messages" params={{ q: sp.q, unread: unreadOnly ? "1" : undefined }} />
      </Card>
      <p className="mt-2 text-[12px] text-neutral-400">Les messages proviennent du formulaire Contact de la boutique.</p>
    </>
  );
}
