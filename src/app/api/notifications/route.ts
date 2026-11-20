import { z } from "zod";
import { api, parseBody } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

export const GET = api(async () => {
  const user = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return { items };
});

const schema = z.object({ ids: z.array(z.string().max(40)).max(100).optional() });

/** Mark notifications as read (all when no ids are given). */
export const POST = api(async (req) => {
  const user = await requireUser();
  const { ids } = await parseBody(req, schema);
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  return { ok: true };
});
