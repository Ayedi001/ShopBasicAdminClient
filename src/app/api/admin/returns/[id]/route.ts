import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { returnUpdateSchema } from "@/lib/validation";
import { updateReturnRequest } from "@/server/returns";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("returns.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, returnUpdateSchema);
  await updateReturnRequest(id, input, user);
  return { ok: true };
});
