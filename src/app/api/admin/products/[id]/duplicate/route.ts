import { api } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { duplicateProduct } from "@/server/products-admin";

export const POST = api<{ id: string }>(async (_req, ctx) => {
  const user = await requireStaff("products.manage");
  const { id } = await ctx.params;
  const copy = await duplicateProduct(id, user);
  return { ok: true, id: copy.id };
});
