import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { promotionSchema } from "@/lib/validation";
import { deletePromotion, savePromotion } from "@/server/promotions-admin";
import { audit } from "@/server/audit";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("promotions.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, promotionSchema);
  await savePromotion(input, id);
  await audit(user, "promotion.update", "Promotion", id, { name: input.name, value: input.value, isActive: input.isActive });
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async (_req, ctx) => {
  const user = await requireStaff("promotions.manage");
  const { id } = await ctx.params;
  await deletePromotion(id);
  await audit(user, "promotion.delete", "Promotion", id);
  return { ok: true };
});
