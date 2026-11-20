import { api, parseBody } from "@/server/http";
import { contactSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { clientIp } from "@/server/auth/session";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { normalizePhone } from "@/lib/phone";

export const POST = api(async (req) => {
  rateLimit(`contact:${await clientIp()}`, LIMITS.contact.limit, LIMITS.contact.windowMs);
  const input = await parseBody(req, contactSchema);
  await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email || null,
      phone: input.phone ? normalizePhone(input.phone) ?? input.phone : null,
      subject: input.subject,
      message: input.message,
    },
  });
  return { ok: true };
});
