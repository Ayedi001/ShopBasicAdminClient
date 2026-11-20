import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { bulkStockSchema } from "@/lib/validation";
import { bulkSetStock } from "@/server/inventory";
import { audit } from "@/server/audit";

export const POST = api(async (req) => {
  const user = await requireStaff("inventory.manage");
  const input = await parseBody(req, bulkStockSchema);
  const result = await bulkSetStock(input.items, input.type, input.reason, user);
  await audit(user, "inventory.bulk", "ProductVariant", null, { count: input.items.length, reason: input.reason, errors: result.errors.length });
  return { ok: result.errors.length === 0, ...result };
});
