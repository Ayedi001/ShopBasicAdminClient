import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { productSchema } from "@/lib/validation";
import { deleteProduct, updateProduct } from "@/server/products-admin";
import { prisma } from "@/server/db";
import { notFound } from "@/server/errors";

export const GET = api<{ id: string }>(async (_req, ctx) => {
  await requireStaff("products.manage");
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      brand: true,
      materials: { include: { material: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { include: { color: true, size: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) throw notFound("Produit introuvable");
  return { product };
});

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("products.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, productSchema);
  await updateProduct(id, input, user);
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async (_req, ctx) => {
  const user = await requireStaff("products.manage");
  const { id } = await ctx.params;
  return deleteProduct(id, user);
});
