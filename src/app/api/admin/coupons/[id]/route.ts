import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { couponSchema } from "@/lib/validation";
import { saveCoupon } from "@/server/promotions-admin";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("promotions.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, couponSchema);
  await saveCoupon(input, id);
  await audit(user, "coupon.update", "Coupon", id, { code: input.code, isActive: input.isActive });
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async (_req, ctx) => {
  const user = await requireStaff("promotions.manage");
  const { id } = await ctx.params;
  const used = await prisma.couponRedemption.count({ where: { couponId: id } });
  if (used) {
    // Keep history of used coupons: deactivate instead of deleting
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    await audit(user, "coupon.deactivate", "Coupon", id);
    return { ok: true, deactivated: true };
  }
  await prisma.coupon.delete({ where: { id } });
  await audit(user, "coupon.delete", "Coupon", id);
  return { ok: true };
});
