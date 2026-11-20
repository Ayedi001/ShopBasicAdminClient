import { api, parseBody } from "@/server/http";
import { checkoutSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/session";
import { placeOrder } from "@/server/orders";
import { getI18n } from "@/server/i18n";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { forbidden } from "@/server/errors";

export const POST = api(async (req) => {
  // Orders require an authenticated customer account
  const user = await requireUser();
  if (user.isStaff) throw forbidden("Utilisez un compte client pour passer commande.");
  rateLimit(`order:${user.id}`, LIMITS.order.limit, LIMITS.order.windowMs);
  const input = await parseBody(req, checkoutSchema);
  const { locale } = await getI18n();
  const order = await placeOrder(user, input, locale);
  return { ok: true, number: order.number };
});
