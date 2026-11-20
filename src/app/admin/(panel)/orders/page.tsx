import Link from "next/link";
import { Download, Phone, Search } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { listOrders } from "@/server/admin-orders";
import { Badge, Card, Empty, PageHeader, Pagination, dt, fdatetime } from "@/components/admin/parts";
import { ORDER_STATUS_LABELS } from "@/components/admin/labels";
import { ORDER_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/components/admin/contact-links";

type SP = { q?: string; status?: string; from?: string; to?: string; page?: string; customer?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await adminPage("orders.view");
  const sp = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await listOrders({ q: sp.q, status, from: sp.from, to: sp.to, userId: sp.customer, page, pageSize: 25 });
  const all = Object.values(data.counts).reduce((s, n) => s + n, 0);
  const params = { q: sp.q, status, from: sp.from, to: sp.to, customer: sp.customer };
  const tab = (s?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, status: s })) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };
  const exportQs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Commandes"
        description="Paiement à la livraison : appelez le client pour confirmer chaque commande en attente."
        actions={
          user.permissions.includes("reports.view") && (
            <a className="a-btn" href={`/api/admin/export/orders${exportQs ? `?${exportQs}` : ""}`}>
              <Download className="h-4 w-4" /> Exporter CSV
            </a>
          )
        }
      />

      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={tab(s)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px]",
              status === s ? "border-neutral-900 font-medium text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900",
            )}
          >
            {s ? ORDER_STATUS_LABELS[s] : "Toutes"}
            <span className={cn("rounded-full px-1.5 text-[11px]", s === "PENDING" && data.counts.PENDING ? "bg-amber-500 text-white" : "bg-neutral-200 text-neutral-700")}>
              {s ? (data.counts[s] ?? 0) : all}
            </span>
          </Link>
        ))}
      </div>

      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/orders">
          {status && <input type="hidden" name="status" value={status} />}
          {sp.customer && <input type="hidden" name="customer" value={sp.customer} />}
          <label className="min-w-[220px] flex-1">
            <span className="a-label">Recherche</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input name="q" defaultValue={sp.q} className="a-input pl-8" placeholder="N° de commande, nom, téléphone, e-mail" />
            </div>
          </label>
          <label>
            <span className="a-label">Du</span>
            <input type="date" name="from" defaultValue={sp.from} className="a-input" />
          </label>
          <label>
            <span className="a-label">Au</span>
            <input type="date" name="to" defaultValue={sp.to} className="a-input" />
          </label>
          <button className="a-btn-primary" type="submit">
            Filtrer
          </button>
          {(sp.q || sp.from || sp.to || sp.customer) && (
            <Link href={status ? `/admin/orders?status=${status}` : "/admin/orders"} className="a-btn-ghost">
              Réinitialiser
            </Link>
          )}
        </form>
        {sp.customer && <p className="border-b border-neutral-100 bg-sky-50 px-3 py-2 text-[12px] text-sky-900">Filtré sur un client. <Link href="/admin/orders" className="underline">Voir toutes les commandes</Link></p>}

        {data.items.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Livraison</th>
                  <th>Articles</th>
                  <th className="text-right">Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                        {o.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-neutral-500">{fdatetime(o.createdAt)}</td>
                    <td>{o.customerName}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <a href={`tel:${o.customerPhone}`} className="a-btn a-btn-sm" title="Appeler">
                          <Phone className="h-3.5 w-3.5" /> {o.customerPhone.replace(/^\+216/, "")}
                        </a>
                        <a href={whatsappLink(o.customerPhone, `Bonjour ${o.customerName}, au sujet de votre commande ${o.number}`)} target="_blank" rel="noreferrer" className="a-btn a-btn-sm text-emerald-700" title="WhatsApp">
                          WA
                        </a>
                      </div>
                    </td>
                    <td className="text-neutral-600">
                      {o.deliveryMethod === "PICKUP" ? "Retrait en boutique" : `${o.city}, ${o.regionName}`}
                    </td>
                    <td className="max-w-[260px] text-[12px] text-neutral-600">
                      <span className="line-clamp-2">
                        {o.items.map((i) => `${i.quantity}× ${i.productName}${i.sizeLabel ? ` (${[i.colorName, i.sizeLabel].filter(Boolean).join(", ")})` : ""}`).join(" · ")}
                      </span>
                    </td>
                    <td className="text-right font-medium tabular-nums">{dt(o.total)}</td>
                    <td>
                      <Badge status={o.status}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Aucune commande ne correspond à ces critères.</Empty>
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} base="/admin/orders" params={params} />
      </Card>
    </>
  );
}
