import { api, parseBody } from "@/server/http";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { clientIp, createSession, dummyVerify, verifyPassword } from "@/server/auth/session";
import { LIMITS, rateLimit, resetRateLimit } from "@/server/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { phoneConfig } from "@/server/settings";
import { AppError } from "@/server/errors";
import { mergeGuestCart } from "@/server/cart";
import { isStaffRole } from "@/lib/constants";
import { audit } from "@/server/audit";

export const POST = api(async (req) => {
  const ip = await clientIp();
  const input = await parseBody(req, loginSchema);
  const identifier = input.identifier.trim().toLowerCase();
  // Throttle both per IP and per account identifier (brute-force protection)
  rateLimit(`login:ip:${ip}`, LIMITS.login.limit * 3, LIMITS.login.windowMs);
  rateLimit(`login:id:${identifier}`, LIMITS.login.limit, LIMITS.login.windowMs);

  const phone = identifier.includes("@") ? null : normalizePhone(identifier, await phoneConfig());
  const user = await prisma.user.findFirst({
    where: identifier.includes("@") ? { email: identifier } : { phone: phone ?? "__invalid__" },
  });
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : (await dummyVerify(), false);
  if (!user || !valid || !user.isActive) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Identifiant ou mot de passe incorrect.");
  }
  resetRateLimit(`login:id:${identifier}`);
  await createSession(user.id, input.remember);
  if (!isStaffRole(user.role)) await mergeGuestCart(user.id);
  else await audit({ id: user.id, fullName: user.fullName }, "auth.login", "User", user.id, { ip });
  return { ok: true, user: { id: user.id, fullName: user.fullName, isStaff: isStaffRole(user.role) } };
});
