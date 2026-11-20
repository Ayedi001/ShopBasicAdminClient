import Link from "next/link";
import { Download } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { analytics, outOfStockProducts, lowStockVariants } from "@/server/reports";
import { Badge, Card, ColorDot, Empty, PageHeader, Stat, dt } from "@/components/admin/parts";
import { BarChart } from "@/components/admin/charts";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await adminPage("reports.view");
  const sp = await searchParams;
  const to = sp.to ? new Date(sp.to + "T23:59:59") : new Date();
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 30 * 86400_000);
  from.setHours(0, 0, 0, 0);

  const [a, outOfStock, lowStock] = await Promise.all([analytics(from, to), outOfStockProducts(), lowStockVariants(20)]);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const qs = `from=${fromStr}&to=${toStr}`;

  return (
    <>
      <PageHeader
        title="Rapports & exports"
        description="Le chiffre d'affaires ne compte que les commandes livrées. Les commandes en attente ou annulées sont exclues."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/admin/export/sales?${qs}`} className="a-btn">
              <Download className="h-4 w-4" /> Ventes CSV
            </a>
            <a href="/api/admin/export/orders" className="a-btn">
              <Download className="h-4 w-4" /> Commandes
            </a>
            <a href="/api/admin/export/products" className="a-btn">
              <Download className="h-4 w-4" /> Catalogue
            </a>
            <a href="/api/admin/export/stock" className="a-btn">
              <Download className="h-4 w-4" /> Stock
            </a>
            <a href="/api/admin/export/customers" className="a-btn">
              <Download className="h-4 w-4" /> Clients
            </a>
          </div>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3" action="/admin/reports">
          <label>
            <span className="a-label">Du</span>
            <input type="date" name="from" defaultValue={fromStr} className="a-input" />
          </label>
          <label>
            <span className="a-label">Au</span>
            <input type="date" name="to" defaultValue={toStr} className="a-input" />
          </label>
          <button className="a-btn-primary">Actualiser</button>
          <Link href="/admin/reports" className="a-btn-ghost">
            30 derniers jours
          </Link>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Commandes reçues" value={a.orders} />
        <Stat label="Livrées" value={a.completedOrders} tone="ok" />
        <Stat label="Chiffre d'affaires" value={dt(a.revenue)} tone="ok" />
        <Stat label="Panier moyen" value={dt(a.averageOrderValue)} />
        <Stat label="Annulations" value={`${a.cancelled} (${a.cancellationRate}%)`} tone={a.cancellationRate > 15 ? "warn" : undefined} />
        <Stat label="Nouveaux clients" value={a.registrations} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Ventes par catégorie">
          {a.salesByCategory.length ? (
            <BarChart data={a.salesByCategory.slice(0, 8).map((c) => ({ label: c.name, value: c.revenue }))} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}` : String(n))} />
          ) : (
            <Empty>Pas encore de ventes livrées sur la période.</Empty>
          )}
        </Card>
        <Card title="Inscriptions clients" bodyClass="p-0">
          {a.registrationsByDay.length ? (
            <div className="max-h-64 overflow-y-auto p-4">
              <BarChart data={a.registrationsByDay.map((d) => ({ label: d.day.slice(5), value: d.count }))} />
            </div>
          ) : (
            <Empty>Aucune inscription.</Empty>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Meilleures ventes" bodyClass="p-0">
          {a.topProducts.length ? (
            <ul className="divide-y divide-neutral-100">
              {a.topProducts.map((p) => (
                <li key={p.productId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-neutral-500">
                    {p.quantity} · {dt(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Pas de données.</Empty>
          )}
        </Card>
        <Card title="Tailles & couleurs" bodyClass="p-0">
          <div className="grid grid-cols-2 divide-x divide-neutral-100">
            <ul className="divide-y divide-neutral-100">
              {a.topSizes.map((s) => (
                <li key={s.size} className="flex justify-between px-3 py-2 text-[13px]">
                  <span>{s.size}</span>
                  <span className="tabular-nums text-neutral-500">{s.qty}</span>
                </li>
              ))}
              {!a.topSizes.length && <li className="px-3 py-6 text-center text-[12px] text-neutral-400">—</li>}
            </ul>
            <ul className="divide-y divide-neutral-100">
              {a.topColors.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
                  <span className="flex items-center gap-1.5 truncate">
                    <ColorDot hex={c.hex} /> {c.name}
                  </span>
                  <span className="tabular-nums text-neutral-500">{c.qty}</span>
                </li>
              ))}
              {!a.topColors.length && <li className="px-3 py-6 text-center text-[12px] text-neutral-400">—</li>}
            </ul>
          </div>
        </Card>
        <Card title="Alertes stock" bodyClass="p-0">
          <div className="border-b border-neutral-100 px-4 py-2 text-[12px] text-neutral-500">
            {outOfStock.length} produit(s) en rupture · {lowStock.length} variante(s) en stock faible
          </div>
          {lowStock.length ? (
            <ul className="divide-y divide-neutral-100">
              {lowStock.slice(0, 12).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 px-4 py-2 text-[13px]">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{v.product.name}</p>
                    <p className="flex items-center gap-1 text-[12px] text-neutral-500">
                      <ColorDot hex={v.color?.hex} /> {[v.color?.name, v.size?.label].filter(Boolean).join(" · ") || "Unique"}
                    </p>
                  </div>
                  <Badge status={v.available <= 0 ? "DANGER" : "PENDING"}>{v.available <= 0 ? "Rupture" : `${v.available}`}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Stock OK.</Empty>
          )}
          <div className="border-t border-neutral-100 p-3">
            <Link href="/admin/inventory?filter=low" className="text-[12px] text-neutral-500 hover:text-neutral-900">
              Ouvrir la gestion du stock →
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
