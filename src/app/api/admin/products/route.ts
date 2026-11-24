import type { Prisma } from "@/server/db";
import { api, intParam, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { productSchema } from "@/lib/validation";
import { createProduct } from "@/server/products-admin";
import { prisma } from "@/server/db";
import { searchTokens } from "@/lib/search-text";

export const GET = api(async (req) => {
  await requireStaff("products.manage");
  const sp = req.nextUrl.searchParams;
  const page = intParam(sp.get("page"), 1);
  const pageSize = intParam(sp.get("pageSize"), 20, 1, 100);
  const where: Prisma.ProductWhereInput = { AND: [] };
  const and = where.AND as Prisma.ProductWhereInput[];
  const q = sp.get("q");
  if (q) for (const t of searchTokens(q)) and.push({ searchText: { contains: t } });
  if (sp.get("status")) and.push({ status: sp.get("status")! });
  if (sp.get("categoryId")) and.push({ categoryId: sp.get("categoryId")! });
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, slug: true, status: true, price: true, minPrice: true, totalAvailable: true, category: { select: { name: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
});

export const POST = api(async (req) => {
  const user = await requireStaff("products.manage");
  const input = await parseBody(req, productSchema);
  const product = await createProduct(input, user);
  return { ok: true, id: product.id, slug: product.slug };
});
