import { api, parseBody } from "@/server/http";
import { registerSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { clientIp, createSession, hashPassword } from "@/server/auth/session";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { phoneConfig } from "@/server/settings";
import { badRequest, conflict } from "@/server/errors";
import { mergeGuestCart } from "@/server/cart";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/i18n";

export const POST = api(async (req) => {
  const ip = await clientIp();
  rateLimit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowMs);
  const input = await parseBody(req, registerSchema);
  const phone = normalizePhone(input.phone, await phoneConfig());
  if (!phone) throw badRequest("VALIDATION", "Téléphone invalide", { phone: "err.phone" });

  const existing = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { phone }] }, select: { email: true, phone: true } });
  if (existing) {
    const fields: Record<string, string> = {};
    if (existing.email === input.email) fields.email = "Un compte existe déjà avec cet e-mail.";
    if (existing.phone === phone) fields.phone = "Un compte existe déjà avec ce numéro.";
    throw conflict("ACCOUNT_EXISTS", "Un compte existe déjà. Connectez-vous.", { fields });
  }
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value ?? null;
  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
      role: "CUSTOMER",
      locale,
      profile: { create: {} },
    },
  });
  await createSession(user.id, true);
  await mergeGuestCart(user.id);
  return { ok: true, user: { id: user.id, fullName: user.fullName } };
});
