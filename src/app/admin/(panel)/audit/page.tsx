import Link from "next/link";
import { adminPage } from "@/server/admin-guard";
import { prisma, icontains } from "@/server/db";
import { Card, Empty, PageHeader, Pagination, fdatetime } from "@/components/admin/parts";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 40;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await adminPage("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where: Prisma.AuditLogWhereInput = q
    ? { OR: [{ action: icontains(q) }, { entity: icontains(q) }, { userName: icontains(q) }, { entityId: icontains(q) }] }
    : {};
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <>
      <PageHeader title="Journal d'audit" description="Opérations sensibles effectuées par l'équipe (commandes, stock, paramètres, personnel…)." />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/audit">
          <label className="min-w-[240px] flex-1">
            <span className="a-label">Recherche</span>
            <input name="q" defaultValue={sp.q} className="a-input" placeholder="Action, entité, utilisateur…" />
          </label>
          <button className="a-btn-primary">Rechercher</button>
          {q && (
            <Link href="/admin/audit" className="a-btn-ghost">
              Réinitialiser
            </Link>
          )}
        </form>
        {logs.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-neutral-500">{fdatetime(l.createdAt)}</td>
                    <td className="font-medium">{l.userName ?? "—"}</td>
                    <td>
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[12px]">{l.action}</code>
                    </td>
                    <td className="text-[12px] text-neutral-600">
                      {l.entity}
                      {l.entityId ? <span className="block truncate text-neutral-400 max-w-[160px]">{l.entityId}</span> : null}
                    </td>
                    <td className="max-w-[320px] truncate font-mono text-[11px] text-neutral-500" title={l.details ?? undefined}>
                      {l.details ? l.details.slice(0, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Aucune entrée.</Empty>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/audit" params={{ q: sp.q }} />
      </Card>
    </>
  );
}
