import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { homeSectionSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { audit } from "@/server/audit";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("content.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, homeSectionSchema);
  await prisma.homeSection.update({ where: { id }, data: { ...input, config: JSON.stringify(input.config) } });
  await audit(user, "home.section", "HomeSection", id, { isVisible: input.isVisible, sortOrder: input.sortOrder });
  return { ok: true };
});
