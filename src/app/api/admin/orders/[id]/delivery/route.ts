import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { orderDeliverySchema } from "@/lib/validation";
import { updateDeliveryInfo } from "@/server/orders";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("orders.update");
  const { id } = await ctx.params;
  const input = await parseBody(req, orderDeliverySchema);
  await updateDeliveryInfo(id, { ...input, deliveredAt: input.deliveredAt || null }, user);
  return { ok: true };
});
