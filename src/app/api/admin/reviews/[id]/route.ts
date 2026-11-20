import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { reviewModerationSchema } from "@/lib/validation";
import { deleteReview, moderateReview } from "@/server/reviews";
import { audit } from "@/server/audit";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("reviews.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, reviewModerationSchema);
  await moderateReview(id, input);
  await audit(user, "review.moderate", "Review", id, input);
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async (_req, ctx) => {
  const user = await requireStaff("reviews.manage");
  const { id } = await ctx.params;
  await deleteReview(id, user);
  await audit(user, "review.delete", "Review", id);
  return { ok: true };
});
