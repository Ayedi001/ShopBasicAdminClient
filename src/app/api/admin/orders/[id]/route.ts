import { api } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { getAdminOrder } from "@/server/admin-orders";
import { notFound } from "@/server/errors";

export const GET = api<{ id: string }>(async (_req, ctx) => {
  await requireStaff("orders.view");
  const { id } = await ctx.params;
  const order = await getAdminOrder(id);
  if (!order) throw notFound("Commande introuvable");
  return { order };
});
