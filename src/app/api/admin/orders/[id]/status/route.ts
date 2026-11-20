import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { orderStatusSchema } from "@/lib/validation";
import { changeOrderStatus } from "@/server/orders";

export const POST = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("orders.update");
  const { id } = await ctx.params;
  const input = await parseBody(req, orderStatusSchema);
  await changeOrderStatus(id, input.status, user, { note: input.note, cancellationReason: input.cancellationReason });
  return { ok: true };
});
