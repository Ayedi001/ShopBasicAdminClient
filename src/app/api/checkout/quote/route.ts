import { z } from "zod";
import { api, parseBody } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { quoteCheckout } from "@/server/orders";
import { getI18n } from "@/server/i18n";

const schema = z.object({
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  regionId: z.string().max(40).optional().default(""),
  couponCode: z.string().max(40).optional().nullable(),
});

export const POST = api(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, schema);
  const { locale } = await getI18n();
  const q = await quoteCheckout(user, { ...input, couponCode: input.couponCode ?? null }, locale);
  return {
    cart: q.view,
    subtotal: q.subtotal,
    promoSavings: q.promoSavings,
    couponDiscount: q.couponDiscount,
    couponCode: q.couponCode,
    couponError: q.couponError,
    shippingFee: q.shipping.fee,
    estimatedDays: q.shipping.estimatedDays,
    shippingError: q.shippingError,
    total: q.total,
  };
});
