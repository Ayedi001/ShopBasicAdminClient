import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { getAdminOrder } from "@/server/admin-orders";
import { Badge, Card, ColorDot, PageHeader, dt, fdatetime } from "@/components/admin/parts";
import { ORDER_STATUS_LABELS, RETURN_STATUS_LABELS, RETURN_TYPE_LABELS } from "@/components/admin/labels";
import { DeliveryForm, NoteForm, OrderStatusActions } from "@/components/admin/order-actions";
import { whatsappLink } from "@/components/admin/contact-links";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await adminPage("orders.view");
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const canUpdate = user.permissions.includes("orders.update");
  const canCancel = user.permissions.includes("orders.cancel");
  const stockLabel = ({ HELD: "Réservé (en attente de confirmation)", DEDUCTED: "Déduit du stock", RELEASED: "Réservation libérée", RESTOCKED: "Remis en stock" } as Record<string, string>)[order.stockState] ?? order.stockState;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Commandes" }}
        title={`Commande ${order.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge status={order.status}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            <span>Passée le {fdatetime(order.createdAt)}</span>
            <span>· Paiement à la livraison</span>
            <span>· Stock : {stockLabel}</span>
          </span>
        }
      />

      {order.status === "PENDING" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 print:hidden">
          <p className="text-[14px] font-medium text-amber-900">Commande à confirmer par téléphone</p>
          <p className="mt-1 text-[13px] text-amber-800">Appelez {order.customerName} pour vérifier l&apos;adresse et la disponibilité avant de confirmer.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${order.customerPhone}`} className="a-btn-primary">
              <Phone className="h-4 w-4" /> Appeler {order.customerPhone}
            </a>
            <a href={whatsappLink(order.customerPhone, `Bonjour ${order.customerName}, nous vous contactons pour confirmer votre commande ${order.number} (${dt(order.total)}).`)} target="_blank" rel="noreferrer" className="a-btn text-emerald-700">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Actions">
            <OrderStatusActions orderId={order.id} status={order.status} canUpdate={canUpdate} canCancel={canCancel} />
            {order.status === "CANCELLED" && order.cancellationReason && (
              <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-[13px]">
                <span className="font-medium">Motif d&apos;annulation :</span> {order.cancellationReason}
              </p>
            )}
          </Card>

          <Card title={`Articles (${order.items.reduce((s, i) => s + i.quantity, 0)})`} bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Variante</th>
                    <th>SKU</th>
                    <th className="text-right">Prix unitaire</th>
                    <th className="text-right">Qté</th>
                    <th className="text-right">Total</th>
                    <th className="print:hidden">Stock actuel</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {i.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.imageUrl} alt="" className="h-12 w-10 shrink-0 rounded bg-neutral-100 object-cover" />
                          )}
                          <div>
                            {i.productId ? (
                              <Link href={`/admin/products/${i.productId}`} className="font-medium hover:underline">
                                {i.productName}
                              </Link>
                            ) : (
                              <span className="font-medium">{i.productName}</span>
                            )}
                            {i.categoryName && <span className="block text-[12px] text-neutral-500">{i.categoryName}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5">
                          <ColorDot hex={i.colorHex} />
                          {[i.colorName, i.sizeLabel].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </td>
                      <td className="text-[12px] text-neutral-500">{i.sku ?? "—"}</td>
                      <td className="text-right tabular-nums">
                        {i.originalUnitPrice > i.unitPrice && <span className="mr-1 text-[12px] text-neutral-400 line-through">{dt(i.originalUnitPrice)}</span>}
                        {dt(i.unitPrice)}
                      </td>
                      <td className="text-right tabular-nums">{i.quantity}</td>
                      <td className="text-right font-medium tabular-nums">{dt(i.lineTotal)}</td>
                      <td className="text-[12px] text-neutral-500 print:hidden">{i.variant ? `${i.variant.available} dispo / ${i.variant.stock} en stock` : "Variante supprimée"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto max-w-xs space-y-1 p-4 text-[13px]">
              <Row label="Sous-total" value={dt(order.subtotal)} />
              {order.discountTotal > 0 && <Row label="Remises produits" value={`− ${dt(order.discountTotal)}`} />}
              {order.couponDiscount > 0 && <Row label={`Coupon ${order.couponCode ?? ""}`} value={`− ${dt(order.couponDiscount)}`} />}
              <Row label="Livraison" value={order.shippingFee ? dt(order.shippingFee) : "Gratuite"} />
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-[15px] font-semibold">
                <dt>Total à encaisser</dt>
                <dd className="tabular-nums">{dt(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Livraison">
            <DeliveryForm
              orderId={order.id}
              disabled={!canUpdate}
              initial={{
                deliveryCompany: order.deliveryCompany,
                trackingNumber: order.trackingNumber,
                deliveryNotes: order.deliveryNotes,
                deliveredAt: order.deliveredAt?.toISOString() ?? null,
              }}
            />
          </Card>

          <Card title="Notes internes">
            <NoteForm orderId={order.id} />
            {order.notes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {order.notes.map((n) => (
                  <li key={n.id} className="rounded-md bg-neutral-50 px-3 py-2 text-[13px]">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {n.authorName ?? "—"} · {fdatetime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Client">
            <p className="font-medium">{order.customerName}</p>
            <p className="mt-1 text-[13px]">
              <a href={`tel:${order.customerPhone}`} className="hover:underline">
                {order.customerPhone}
              </a>
            </p>
            <p className="text-[13px] text-neutral-600">{order.customerEmail}</p>
            <div className="mt-3 flex gap-2 print:hidden">
              <a href={`tel:${order.customerPhone}`} className="a-btn a-btn-sm">
                <Phone className="h-3.5 w-3.5" /> Appeler
              </a>
              <a href={whatsappLink(order.customerPhone)} target="_blank" rel="noreferrer" className="a-btn a-btn-sm text-emerald-700">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
            {user.permissions.includes("customers.view") && (
              <p className="mt-3 text-[12px] text-neutral-500 print:hidden">
                <Link href={`/admin/customers/${order.user.id}`} className="underline">
                  Fiche client
                </Link>{" "}
                · {order.user._count.orders} commande(s) au total
              </p>
            )}
          </Card>

          <Card title={order.deliveryMethod === "PICKUP" ? "Retrait en boutique" : "Adresse de livraison"}>
            {order.deliveryMethod === "PICKUP" ? (
              <p className="text-[13px]">Le client récupère sa commande en boutique.</p>
            ) : (
              <address className="text-[13px] not-italic leading-relaxed">
                {order.address}
                <br />
                {order.city}
                {order.postalCode ? ` ${order.postalCode}` : ""}
                <br />
                {order.regionName}
              </address>
            )}
            {order.deliveryInstructions && (
              <p className="mt-2 rounded-md bg-neutral-50 px-3 py-2 text-[13px]">
                <span className="font-medium">Instructions :</span> {order.deliveryInstructions}
              </p>
            )}
          </Card>

          <Card title="Historique">
            <ol className="relative space-y-4 border-l border-neutral-200 pl-4">
              {order.history.map((h) => (
                <li key={h.id} className="text-[13px]">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-neutral-900" />
                  <p className="font-medium">
                    {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus]} → ` : ""}
                    {ORDER_STATUS_LABELS[h.toStatus]}
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    {fdatetime(h.createdAt)} · {h.changedByName ?? "Client"}
                  </p>
                  {h.note && <p className="mt-1 text-[12px] text-neutral-700">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>

          {order.returnRequests.length > 0 && (
            <Card title="Retours / échanges">
              <ul className="space-y-2 text-[13px]">
                {order.returnRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/returns/${r.id}`} className="font-medium hover:underline">
                      {r.number} · {RETURN_TYPE_LABELS[r.type]}
                    </Link>
                    <Badge status={r.status}>{RETURN_STATUS_LABELS[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
