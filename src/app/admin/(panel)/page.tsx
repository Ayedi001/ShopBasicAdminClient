import Link from "next/link";
import { adminPage } from "@/server/admin-guard";
import { dashboardOverview, outOfStockProducts, salesSeries, type Period } from "@/server/reports";
import { Badge, Card, ColorDot, Empty, PageHeader, Stat, dt, fdatetime } from "@/components/admin/parts";
import { BarChart } from "@/components/admin/charts";
import { ORDER_STATUS_LABELS } from "@/components/admin/labels";
import { PERMISSION_LABELS, type Permission } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "14 jours" },
  { key: "week", label: "12 semaines" },
  { key: "month", label: "12 mois" },
  { key: "year", label: "5 ans" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; denied?: string }> }) {
  const user = await adminPage();
  const sp = await searchParams;
  const denied = sp.denied && sp.denied in PERMISSION_LABELS ? PERMISSION_LABELS[sp.denied as Permission] : null;

  if (!user.permissions.includes("dashboard.view")) {
    return (
      <>
        <PageHeader title={`Bonjour ${user.fullName.split(" ")[0]}`} />
        {denied && <DeniedBanner label={denied} />}
        <Card>
          <p className="text-[14px] text-neutral-600">Utilisez le menu pour accéder aux sections autorisées pour votre rôle.</p>
        </Card>
      </>
    );
  }

  const period = (PERIODS.some((p) => p.key === sp.period) ? sp.period : "day") as Period;
  const [o, series, outOfStock] = await Promise.all([dashboardOverview(), salesSeries(period), outOfStockProducts()]);
  const canOrders = user.permissions.includes("orders.view");
  const canStock = user.permissions.includes("inventory.manage");

  return (
    <>
      <PageHeader title={`Bonjour ${user.fullName.split(" ")[0]}`} description="Vue d'ensemble de la boutique. Le chiffre d'affaires ne compte que les commandes livrées." />
      {denied && <DeniedBanner label={denied} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Commandes" value={o.totalOrders} href={canOrders ? "/admin/orders" : undefined} />
        <Stat label="À confirmer" value={o.pending} tone={o.pending ? "warn" : undefined} hint="à appeler" href={canOrders ? "/admin/orders?status=PENDING" : undefined} />
        <Stat label="Confirmées / en préparation" value={o.confirmed + o.preparing} href={canOrders ? "/admin/orders?status=CONFIRMED" : undefined} />
        <Stat label="Expédiées" value={o.shipped} href={canOrders ? "/admin/orders?status=SHIPPED" : undefined} />
        <Stat label="Livrées" value={o.delivered} tone="ok" href={canOrders ? "/admin/orders?status=DELIVERED" : undefined} />
        <Stat label="Annulées" value={o.cancelled} href={canOrders ? "/admin/orders?status=CANCELLED" : undefined} />
        <Stat label="Chiffre d'affaires (livré)" value={dt(o.revenue)} tone="ok" />
        <Stat label="En cours (non livré)" value={dt(o.pipeline)} hint={`${o.pipelineCount} commande(s)`} />
        <Stat label="Panier moyen" value={dt(o.averageOrderValue)} />
        <Stat label="Clients" value={o.customers} href={user.permissions.includes("customers.view") ? "/admin/customers" : undefined} />
        <Stat label="Produits actifs" value={o.products} hint={`${outOfStock.length} en rupture`} href={user.permissions.includes("products.manage") ? "/admin/products" : undefined} />
        <Stat
          label="Retours / avis en attente"
          value={`${o.pendingReturns} / ${o.pendingReviews}`}
          tone={o.pendingReturns + o.pendingReviews ? "warn" : undefined}
          href={user.permissions.includes("returns.manage") ? "/admin/returns" : undefined}
        />
      </div>

      <Card
        className="mt-4"
        title="Ventes"
        actions={
          <div className="flex rounded-md border border-neutral-200 p-0.5">
            {PERIODS.map((p) => (
              <Link key={p.key} href={`/admin?period=${p.key}`} className={cn("rounded px-2 py-1 text-[12px]", p.key === period ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
                {p.label}
              </Link>
            ))}
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[12px] font-medium text-neutral-500">Chiffre d&apos;affaires livré</p>
            <BarChart data={series.map((s) => ({ label: s.label, value: s.revenue }))} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}` : String(n))} />
            <p className="mt-1 text-[11px] text-neutral-400">Montants en DT, par date de commande.</p>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-medium text-neutral-500">Commandes</p>
            <BarChart data={series.map((s) => ({ label: s.label, value: s.committed, secondary: s.orders }))} primaryLabel="Validées" secondaryLabel="Total reçues" />
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Dernières commandes" actions={canOrders && <Link href="/admin/orders" className="text-[12px] text-neutral-500 hover:text-neutral-900">Tout voir →</Link>} bodyClass="p-0">
          {o.recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Articles</th>
                    <th className="text-right">Total</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {o.recentOrders.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{canOrders ? <Link href={`/admin/orders/${r.id}`} className="hover:underline">{r.number}</Link> : r.number}</td>
                      <td>
                        {r.customerName}
                        <span className="block text-[12px] text-neutral-500">{r.customerPhone}</span>
                      </td>
                      <td className="whitespace-nowrap text-neutral-500">{fdatetime(r.createdAt)}</td>
                      <td>{r._count.items}</td>
                      <td className="text-right tabular-nums">{dt(r.total)}</td>
                      <td>
                        <Badge status={r.status}>{ORDER_STATUS_LABELS[r.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Aucune commande pour le moment.</Empty>
          )}
        </Card>

        <Card title="Stock faible" actions={canStock && <Link href="/admin/inventory?filter=low" className="text-[12px] text-neutral-500 hover:text-neutral-900">Gérer →</Link>} bodyClass="p-0">
          {o.lowStock.length ? (
            <ul className="divide-y divide-neutral-100">
              {o.lowStock.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.product.name}</p>
                    <p className="flex items-center gap-1.5 text-[12px] text-neutral-500">
                      <ColorDot hex={v.color?.hex} /> {[v.color?.name, v.size?.label].filter(Boolean).join(" · ") || "Variante unique"}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums", v.available <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>
                    {v.available <= 0 ? "Rupture" : `${v.available} dispo`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Aucune variante en stock faible.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}

function DeniedBanner({ label }: { label: string }) {
  return <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">Accès refusé : la permission « {label} » est nécessaire pour cette page.</p>;
}
