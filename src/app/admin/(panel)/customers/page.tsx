import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Download, Search } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { prisma, icontains } from "@/server/db";
import { Card, Empty, PageHeader, Pagination, dt, fdate } from "@/components/admin/parts";

const PAGE_SIZE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await adminPage("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const digits = q?.replace(/\D/g, "") ?? "";
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q ? { OR: [{ fullName: icontains(q) }, { email: icontains(q.toLowerCase()) }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] } : {}),
  };
  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { profile: { include: { region: true } }, orders: { select: { total: true, status: true, createdAt: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${total} client(s) inscrit(s)`}
        actions={
          user.permissions.includes("reports.view") && (
            <a href="/api/admin/export/customers" className="a-btn">
              <Download className="h-4 w-4" /> Exporter CSV
            </a>
          )
        }
      />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/customers">
          <label className="min-w-[240px] flex-1">
            <span className="a-label">Recherche</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input name="q" defaultValue={sp.q} className="a-input pl-8" placeholder="Nom, e-mail ou téléphone" />
            </div>
          </label>
          <button className="a-btn-primary">Rechercher</button>
          {q && (
            <Link href="/admin/customers" className="a-btn-ghost">
              Réinitialiser
            </Link>
          )}
        </form>
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Ville</th>
                  <th>Inscription</th>
                  <th className="text-right">Commandes</th>
                  <th className="text-right">Total livré</th>
                  <th>Dernière commande</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const delivered = c.orders.filter((o) => o.status === "DELIVERED");
                  const last = c.orders.reduce<Date | null>((m, o) => (!m || o.createdAt > m ? o.createdAt : m), null);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                          {c.fullName}
                        </Link>
                        <span className="block text-[12px] text-neutral-500">{c.email}</span>
                        {!c.isActive && <span className="text-[11px] text-red-600">Compte désactivé</span>}
                      </td>
                      <td>
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      </td>
                      <td className="text-neutral-600">{[c.profile?.city, c.profile?.region?.name].filter(Boolean).join(", ") || "—"}</td>
                      <td className="text-neutral-500">{fdate(c.createdAt)}</td>
                      <td className="text-right tabular-nums">{c.orders.length}</td>
                      <td className="text-right tabular-nums">{dt(delivered.reduce((s, o) => s + o.total, 0))}</td>
                      <td className="text-neutral-500">{last ? fdate(last) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Aucun client trouvé.</Empty>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/customers" params={{ q: sp.q }} />
      </Card>
    </>
  );
}
