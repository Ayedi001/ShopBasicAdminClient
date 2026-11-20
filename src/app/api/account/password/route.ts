import { api, parseBody } from "@/server/http";
import { changePasswordSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { destroyOtherSessions, hashPassword, requireUser, verifyPassword } from "@/server/auth/session";
import { badRequest } from "@/server/errors";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const POST = api(async (req) => {
  const user = await requireUser();
  rateLimit(`password:${user.id}`, LIMITS.password.limit, LIMITS.password.windowMs);
  const input = await parseBody(req, changePasswordSchema);
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(input.currentPassword, record.passwordHash))) {
    throw badRequest("WRONG_PASSWORD", "Mot de passe actuel incorrect.", { currentPassword: "Mot de passe incorrect" });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  await destroyOtherSessions(user.id);
  return { ok: true };
});
