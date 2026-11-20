import { api, parseBody } from "@/server/http";
import { profileSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { normalizePhone } from "@/lib/phone";
import { phoneConfig } from "@/server/settings";
import { badRequest, conflict } from "@/server/errors";

export const PUT = api(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, profileSchema);
  const phone = normalizePhone(input.phone, await phoneConfig());
  if (!phone) throw badRequest("VALIDATION", "Téléphone invalide", { phone: "err.phone" });
  const clash = await prisma.user.findFirst({
    where: { id: { not: user.id }, OR: [{ email: input.email }, { phone }] },
    select: { email: true },
  });
  if (clash) {
    throw conflict("DUPLICATE", "E-mail ou téléphone déjà utilisé par un autre compte.", {
      fields: clash.email === input.email ? { email: "Déjà utilisé" } : { phone: "Déjà utilisé" },
    });
  }
  if (input.regionId) {
    const region = await prisma.deliveryRegion.findUnique({ where: { id: input.regionId } });
    if (!region) throw badRequest("VALIDATION", "Région invalide", { regionId: "err.required" });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: input.fullName,
      email: input.email,
      phone,
      profile: {
        upsert: {
          create: { address: input.address, city: input.city, regionId: input.regionId, postalCode: input.postalCode, deliveryInstructions: input.deliveryInstructions },
          update: { address: input.address, city: input.city, regionId: input.regionId, postalCode: input.postalCode, deliveryInstructions: input.deliveryInstructions },
        },
      },
    },
  });
  return { ok: true };
});
