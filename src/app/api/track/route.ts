import { api, parseBody } from "@/server/http";
import { trackOrderSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { clientIp } from "@/server/auth/session";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { phoneConfig } from "@/server/settings";
import { notFound } from "@/server/errors";

/** Public order status lookup — requires BOTH the order number and the phone used for the order. */
export const POST = api(async (req) => {
  rateLimit(`track:${await clientIp()}`, LIMITS.track.limit, LIMITS.track.windowMs);
  const input = await parseBody(req, trackOrderSchema);
  const phone = normalizePhone(input.phone, await phoneConfig());
  const order = await prisma.order.findFirst({
    where: { number: input.number.trim().toUpperCase(), customerPhone: phone ?? "__none__" },
    select: {
      number: true,
      status: true,
      createdAt: true,
      deliveryCompany: true,
      trackingNumber: true,
      history: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true } },
      _count: { select: { items: true } },
    },
  });
  if (!order) throw notFound("Commande introuvable");
  return { order };
});
