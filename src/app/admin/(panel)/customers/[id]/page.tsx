import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { Badge, Card, Empty, PageHeader, dt, fdate, fdatetime } from "@/components/admin/parts";
import { ORDER_STATUS_LABELS } from "@/components/admin/labels";
import { whatsappLink } from "@/components/admin/contact-links";
import { formatPhone } from "@/lib/phone";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await adminPage("customers.view");
  const { id } = await params;
  const customer = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: {
      profile: { include: { region: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } },
    },
  });
  if (!customer) notFound();

  const delivered = customer.orders.filter((o) => o.status === "DELIVERED");
  const revenue = delivered.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title={customer.fullName}
        description={customer.email}
        back={{ href: "/admin/customers", label: "Clients" }}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${customer.phone}`} className="a-btn-primary">
              <Phone className="h-4 w-4" /> Appeler
            </a>
            <a href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer" className="a-btn">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Coordonnées">
          <dl className="space-y-2 text-[13px]">
            <Row label="Téléphone">{formatPhone(customer.phone)}</Row>
            <Row label="E-mail">{customer.email}</Row>
            <Row label="Adresse">{customer.profile?.address || "—"}</Row>
            <Row label="Ville">{customer.profile?.city || "—"}</Row>
            <Row label="Région">{customer.profile?.region?.name || "—"}</Row>
            <Row label="Inscription">{fdate(customer.createdAt)}</Row>
            <Row label="Dernière connexion">{customer.lastLoginAt ? fdatetime(customer.lastLoginAt) : "—"}</Row>
            <Row label="Compte">{customer.isActive ? "Actif" : "Désactivé"}</Row>
          </dl>
        </Card>

        <Card title="Synthèse" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Commandes" value={customer.orders.length} />
            <MiniStat label="Livrées" value={delivered.length} />
            <MiniStat label="Total livré" value={dt(revenue)} />
            <MiniStat label="Panier moyen" value={delivered.length ? dt(Math.round(revenue / delivered.length)) : "—"} />
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Historique des commandes" bodyClass="p-0">
        {customer.orders.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Articles</th>
                  <th className="text-right">Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                        {o.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-neutral-500">{fdatetime(o.createdAt)}</td>
                    <td>{o._count.items}</td>
                    <td className="text-right tabular-nums">{dt(o.total)}</td>
                    <td>
                      <Badge status={o.status}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Aucune commande.</Empty>
        )}
      </Card>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-50 py-1.5 last:border-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-900">{children}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}
