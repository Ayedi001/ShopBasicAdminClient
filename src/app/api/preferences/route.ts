import { z } from "zod";
import { cookies } from "next/headers";
import { api, parseBody } from "@/server/http";
import { CURRENCY_COOKIE, LOCALE_COOKIE } from "@/i18n";
import { getSetting } from "@/server/settings";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

const schema = z.object({ locale: z.enum(["fr", "ar", "en"]).optional(), currency: z.string().length(3).optional() });

export const POST = api(async (req) => {
  const input = await parseBody(req, schema);
  const jar = await cookies();
  const general = await getSetting("general");
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  if (input.locale && general.enabledLocales.includes(input.locale)) {
    jar.set(LOCALE_COOKIE, input.locale, opts);
    const user = await getCurrentUser();
    if (user) await prisma.user.update({ where: { id: user.id }, data: { locale: input.locale } });
  }
  if (input.currency && general.currencies.some((c) => c.code === input.currency)) jar.set(CURRENCY_COOKIE, input.currency, opts);
  return { ok: true };
});
