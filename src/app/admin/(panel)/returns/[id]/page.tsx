import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { Badge, Card, ColorDot, PageHeader, dt, fdatetime } from "@/components/admin/parts";
import { RETURN_REASON_LABELS, RETURN_STATUS_LABELS, RETURN_TYPE_LABELS } from "@/components/admin/labels";
import { ReturnActions } from "@/components/admin/return-actions";

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await adminPage("returns.manage");
  const { id } = await params;
  const r = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: { select: { id: true, number: true, customerName: true, customerPhone: true, customerEmail: true, deliveredAt: true } },
      items: { include: { orderItem: true } },
    },
  });
  if (!r) notFound();

  // Replacement options: active, in-stock variants of the same products
  const productIds = [...new Set(r.items.map((i) => i.orderItem.productId).filter(Boolean) as string[])];
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds }, isActive: true },
    include: { color: true, size: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <PageHeader
        back={{ href: "/admin/returns", label: "Retours et échanges" }}
        title={`${RETURN_TYPE_LABELS[r.type]} ${r.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge status={r.status}>{RETURN_STATUS_LABELS[r.status]}</Badge>
            <span>Demandé le {fdatetime(r.createdAt)}</span>
            {r.restocked && <span>· Articles remis en stock</span>}
          </span>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Articles concernés" bodyClass="p-0">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Variante achetée</th>
                  <th className="text-right">Qté</th>
                  <th className="text-right">Prix payé</th>
                  {r.type === "EXCHANGE" && <th>Taille souhaitée</th>}
                  {r.type === "EXCHANGE" && <th>Remplacement</th>}
                </tr>
              </thead>
              <tbody>
                {r.items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.orderItem.productName}</td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <ColorDot hex={i.orderItem.colorHex} />
                        {[i.orderItem.colorName, i.orderItem.sizeLabel].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{i.quantity}</td>
                    <td className="text-right tabular-nums">{dt(i.orderItem.unitPrice)}</td>
                    {r.type === "EXCHANGE" && <td>{i.requestedSize ?? "—"}</td>}
                    {r.type === "EXCHANGE" && <td className="text-[12px]">{i.replacementLabel ?? "Non défini"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Traitement">
            <ReturnActions
              id={r.id}
              type={r.type}
              status={r.status}
              restocked={r.restocked}
              initial={{ adminNotes: r.adminNotes ?? "", rejectionReason: r.rejectionReason ?? "", replacementNote: r.replacementNote ?? "" }}
              items={r.items.map((i) => ({
                id: i.id,
                label: `${i.quantity}× ${i.orderItem.productName} (${[i.orderItem.colorName, i.orderItem.sizeLabel].filter(Boolean).join(" · ")})`,
                quantity: i.quantity,
                replacementVariantId: i.replacementVariantId,
                options: variants
                  .filter((v) => v.productId === i.orderItem.productId)
                  .map((v) => ({ value: v.id, label: `${[v.color?.name, v.size?.label].filter(Boolean).join(" · ") || "Unique"} — ${v.available} dispo`, available: v.available })),
              }))}
            />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Demande du client">
            <dl className="space-y-2 text-[13px]">
              <div>
                <dt className="text-neutral-500">Motif</dt>
                <dd className="font-medium">{RETURN_REASON_LABELS[r.reason] ?? r.reason}</dd>
              </div>
              {r.description && (
                <div>
                  <dt className="text-neutral-500">Commentaire</dt>
                  <dd className="whitespace-pre-line">{r.description}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card title="Commande d'origine">
            <p className="text-[13px]">
              <Link href={`/admin/orders/${r.order.id}`} className="font-medium hover:underline">
                {r.order.number}
              </Link>
              {r.order.deliveredAt && <span className="text-neutral-500"> · livrée le {fdatetime(r.order.deliveredAt)}</span>}
            </p>
            <p className="mt-2 text-[13px] font-medium">{r.order.customerName}</p>
            <p className="text-[13px] text-neutral-600">{r.order.customerEmail}</p>
            <a href={`tel:${r.order.customerPhone}`} className="a-btn a-btn-sm mt-2">
              <Phone className="h-3.5 w-3.5" /> {r.order.customerPhone}
            </a>
          </Card>
        </div>
      </div>
    </>
  );
}
