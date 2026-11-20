import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { variantsSchema } from "@/lib/validation";
import { saveVariants } from "@/server/products-admin";
import { prisma } from "@/server/db";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("products.manage");
  const { id } = await ctx.params;
  const { variants } = await parseBody(req, variantsSchema);
  await saveVariants(id, variants, user);
  const fresh = await prisma.productVariant.findMany({ where: { productId: id }, include: { color: true, size: true }, orderBy: { sortOrder: "asc" } });
  return { ok: true, variants: fresh };
});
