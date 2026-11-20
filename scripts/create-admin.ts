/* eslint-disable no-console */
/**
 * Create (or reset) an OWNER administrator without seeding demo data.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts --email owner@shop.tn --password 'StrongPass1' --name "Propriétaire" --phone 98123456
 *
 * Or via env:
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME / SEED_ADMIN_PHONE
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizePhone } from "../src/lib/phone";

const prisma = new PrismaClient();

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg("email") ?? process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = arg("password") ?? process.env.SEED_ADMIN_PASSWORD ?? "";
  const fullName = (arg("name") ?? process.env.SEED_ADMIN_NAME ?? "Propriétaire").trim();
  const phoneRaw = arg("phone") ?? process.env.SEED_ADMIN_PHONE ?? "20000000";
  const phone = normalizePhone(phoneRaw);

  if (!email || !email.includes("@")) {
    console.error("E-mail requis : --email ou SEED_ADMIN_EMAIL");
    process.exit(1);
  }
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error("Mot de passe requis (8+ car., lettres et chiffres) : --password ou SEED_ADMIN_PASSWORD");
    process.exit(1);
  }
  if (!phone) {
    console.error("Téléphone invalide (ex. 98 123 456) : --phone ou SEED_ADMIN_PHONE");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });

  if (existing) {
    if (existing.role === "CUSTOMER") {
      console.error(`Un compte client existe déjà avec cet e-mail/téléphone (${existing.email}). Choisissez d'autres identifiants.`);
      process.exit(1);
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { fullName, email, phone, passwordHash, role: "OWNER", isActive: true, permissions: null },
    });
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    console.log(`Administrateur mis à jour : ${email} (rôle OWNER)`);
  } else {
    await prisma.user.create({
      data: { fullName, email, phone, passwordHash, role: "OWNER", isActive: true },
    });
    console.log(`Administrateur créé : ${email} (rôle OWNER)`);
  }
  console.log("Connectez-vous sur /admin/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

