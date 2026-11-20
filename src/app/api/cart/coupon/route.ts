import { api, parseBody } from "@/server/http";
import { couponCheckSchema } from "@/lib/validation";
import { setCartCoupon } from "@/server/cart";
import { getI18n } from "@/server/i18n";
import { clientIp } from "@/server/auth/session";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const POST = api(async (req) => {
  rateLimit(`coupon:${await clientIp()}`, LIMITS.coupon.limit, LIMITS.coupon.windowMs);
  const { code } = await parseBody(req, couponCheckSchema);
  const { locale } = await getI18n();
  return { cart: await setCartCoupon(code, locale) };
});

export const DELETE = api(async () => {
  const { locale } = await getI18n();
  return { cart: await setCartCoupon(null, locale) };
});
