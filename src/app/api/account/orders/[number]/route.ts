import { api } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getOwnOrder } from "@/server/account";
import { notFound } from "@/server/errors";

export const GET = api<{ number: string }>(async (_req, ctx) => {
  const user = await requireUser();
  const { number } = await ctx.params;
  const order = await getOwnOrder(user.id, number);
  // Same response for "doesn't exist" and "belongs to someone else" (no information leak)
  if (!order) throw notFound("Commande introuvable");
  return {
    order: {
      number: order.number,
      status: order.status,
      createdAt: order.createdAt,
      total: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      couponDiscount: order.couponDiscount,
      deliveryCompany: order.deliveryCompany,
      trackingNumber: order.trackingNumber,
      items: order.items.map((i) => ({ id: i.id, productName: i.productName, colorName: i.colorName, sizeLabel: i.sizeLabel, quantity: i.quantity, unitPrice: i.unitPrice })),
      history: order.history,
    },
  };
});
