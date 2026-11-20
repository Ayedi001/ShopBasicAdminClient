import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { promotionSchema } from "@/lib/validation";
import { savePromotion } from "@/server/promotions-admin";
import { audit } from "@/server/audit";

export const POST = api(async (req) => {
  const user = await requireStaff("promotions.manage");
  const input = await parseBody(req, promotionSchema);
  const p = await savePromotion(input);
  await audit(user, "promotion.create", "Promotion", p.id, { name: p.name, type: p.type, value: p.value });
  return { ok: true, id: p.id };
});
