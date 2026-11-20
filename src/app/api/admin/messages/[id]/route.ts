import { api } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { prisma } from "@/server/db";

export const PATCH = api<{ id: string }>(async (_req, ctx) => {
  await requireStaff("customers.view");
  const { id } = await ctx.params;
  await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async (_req, ctx) => {
  await requireStaff("customers.view");
  const { id } = await ctx.params;
  await prisma.contactMessage.delete({ where: { id } });
  return { ok: true };
});
