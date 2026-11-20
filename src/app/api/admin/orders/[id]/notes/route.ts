import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { orderNoteSchema } from "@/lib/validation";
import { addOrderNote } from "@/server/orders";

export const POST = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("orders.view");
  const { id } = await ctx.params;
  const { body } = await parseBody(req, orderNoteSchema);
  const note = await addOrderNote(id, body, user);
  return { ok: true, note };
});
