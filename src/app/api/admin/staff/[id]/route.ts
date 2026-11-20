import { api, parseBody } from "@/server/http";
import { hashPassword, requireStaff } from "@/server/auth/session";
import { staffSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { badRequest, conflict, forbidden, notFound } from "@/server/errors";
import { normalizePhone } from "@/lib/phone";
import { audit } from "@/server/audit";
import { isStaffRole } from "@/lib/constants";

export const PUT = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("staff.manage");
  const { id } = await ctx.params;
  const input = await parseBody(req, staffSchema);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || !isStaffRole(target.role)) throw notFound("Membre introuvable");
  if ((target.role === "OWNER" || input.role === "OWNER") && user.role !== "OWNER") throw forbidden();
  if (target.id === user.id && (input.role !== target.role || !input.isActive)) {
    throw badRequest("SELF_LOCKOUT", "Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte.");
  }
  if (target.role === "OWNER" && input.role !== "OWNER") {
    const owners = await prisma.user.count({ where: { role: "OWNER", isActive: true } });
    if (owners <= 1) throw badRequest("LAST_OWNER", "Il doit rester au moins un propriétaire actif.");
  }
  const phone = normalizePhone(input.phone);
  if (!phone) throw badRequest("VALIDATION", "Téléphone invalide", { phone: "err.phone" });
  const clash = await prisma.user.findFirst({ where: { id: { not: id }, OR: [{ email: input.email }, { phone }] } });
  if (clash) throw conflict("DUPLICATE", "E-mail ou téléphone déjà utilisé.");
  await prisma.user.update({
    where: { id },
    data: {
      fullName: input.fullName,
      email: input.email,
      phone,
      role: input.role,
      isActive: input.isActive,
      permissions: input.role === "OWNER" || !input.permissions ? null : input.permissions.join(","),
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });
  if (!input.isActive || input.password) await prisma.session.deleteMany({ where: { userId: id } });
  await audit(user, "staff.update", "User", id, { role: input.role, isActive: input.isActive, permissions: input.permissions, passwordReset: !!input.password });
  return { ok: true };
});
