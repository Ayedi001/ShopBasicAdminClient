import { api, parseBody } from "@/server/http";
import { returnRequestSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/session";
import { createReturnRequest } from "@/server/returns";
import { prisma } from "@/server/db";

export const GET = api(async () => {
  const user = await requireUser();
  const items = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { number: true } }, items: { include: { orderItem: { select: { productName: true, sizeLabel: true, colorName: true } } } } },
  });
  return { items };
});

export const POST = api(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, returnRequestSchema);
  const r = await createReturnRequest(user, input);
  return { ok: true, number: r.number };
});
