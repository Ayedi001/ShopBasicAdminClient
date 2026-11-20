import Link from "next/link";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { RETURN_STATUSES } from "@/lib/constants";
import { Badge, Card, Empty, PageHeader, Pagination, fdatetime } from "@/components/admin/parts";
import { RETURN_REASON_LABELS, RETURN_STATUS_LABELS, RETURN_TYPE_LABELS } from "@/components/admin/labels";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await adminPage("returns.manage");
  const sp = await searchParams;
  const status = (RETURN_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = status ? { status } : {};
  const [items, total, counts] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { order: { select: { id: true, number: true, customerName: true, customerPhone: true } }, items: { include: { orderItem: { select: { productName: true } } } } },
    }),
    prisma.returnRequest.count({ where }),
    prisma.returnRequest.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader title="Retours et échanges" description="Demandes envoyées par les clients depuis leur compte, après livraison et dans le délai autorisé." />
      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {[undefined, ...RETURN_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/returns?status=${s}` : "/admin/returns"}
            className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px]", status === s ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}
          >
            {s ? RETURN_STATUS_LABELS[s] : "Toutes"}
            <span className="rounded-full bg-neutral-200 px-1.5 text-[11px]">{s ? count(s) : counts.reduce((a, c) => a + c._count, 0)}</span>
          </Link>
        ))}
      </div>
      <Card bodyClass="p-0">
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Motif</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">
                      <Link href={`/admin/returns/${r.id}`} className="hover:underline">
                        {r.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-neutral-500">{fdatetime(r.createdAt)}</td>
                    <td>{RETURN_TYPE_LABELS[r.type]}</td>
                    <td>
                      <Link href={`/admin/orders/${r.order.id}`} className="hover:underline">
                        {r.order.number}
                      </Link>
                    </td>
                    <td>
                      {r.order.customerName}
                      <span className="block text-[12px] text-neutral-500">{r.order.customerPhone}</span>
                    </td>
                    <td className="max-w-[240px] text-[12px] text-neutral-600">{r.items.map((i) => `${i.quantity}× ${i.orderItem.productName}`).join(", ")}</td>
                    <td className="text-[12px]">{RETURN_REASON_LABELS[r.reason] ?? r.reason}</td>
                    <td>
                      <Badge status={r.status}>{RETURN_STATUS_LABELS[r.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Aucune demande.</Empty>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/returns" params={{ status }} />
      </Card>
    </>
  );
}
