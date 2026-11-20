import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { couponSchema } from "@/lib/validation";
import { saveCoupon } from "@/server/promotions-admin";
import { audit } from "@/server/audit";

export const POST = api(async (req) => {
  const user = await requireStaff("promotions.manage");
  const input = await parseBody(req, couponSchema);
  const c = await saveCoupon(input);
  await audit(user, "coupon.create", "Coupon", c.id, { code: c.code });
  return { ok: true, id: c.id };
});
