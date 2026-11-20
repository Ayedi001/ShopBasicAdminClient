import { api, parseBody } from "@/server/http";
import { hashPassword, requireStaff } from "@/server/auth/session";
import { staffSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { badRequest, conflict, forbidden } from "@/server/errors";
import { normalizePhone } from "@/lib/phone";
import { audit } from "@/server/audit";

export const POST = api(async (req) => {
  const user = await requireStaff("staff.manage");
  const input = await parseBody(req, staffSchema);
  if (input.role === "OWNER" && user.role !== "OWNER") throw forbidden("Seul un propriétaire peut créer un autre propriétaire.");
  if (!input.password) throw badRequest("VALIDATION", "Mot de passe requis", { password: "err.required" });
  const phone = normalizePhone(input.phone);
  if (!phone) throw badRequest("VALIDATION", "Téléphone invalide", { phone: "err.phone" });
  const clash = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { phone }] } });
  if (clash) throw conflict("DUPLICATE", "E-mail ou téléphone déjà utilisé.");
  const created = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone,
      role: input.role,
      isActive: input.isActive,
      passwordHash: await hashPassword(input.password),
      permissions: input.role === "OWNER" || !input.permissions ? null : input.permissions.join(","),
    },
  });
  await audit(user, "staff.create", "User", created.id, { email: created.email, role: created.role });
  return { ok: true, id: created.id };
});
