import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { stockAdjustSchema } from "@/lib/validation";
import { adjustStock } from "@/server/inventory";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";

export const POST = api(async (req) => {
  const user = await requireStaff("inventory.manage");
  const input = await parseBody(req, stockAdjustSchema);
  await adjustStock(input, user);
  await audit(user, "inventory.adjust", "ProductVariant", input.variantId, input);
  const variant = await prisma.productVariant.findUnique({ where: { id: input.variantId }, select: { stock: true, reserved: true, available: true } });
  return { ok: true, variant };
});
