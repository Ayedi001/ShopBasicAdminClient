import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { forbidden, unauthorized } from "../errors";
import { isStaffRole, permissionsFor, type Permission } from "@/lib/constants";

export const SESSION_COOKIE = "ms_session";
const REMEMBER_DAYS = 30;
const SHORT_SESSION_HOURS = 24;

const cookieSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
let dummyHash: Promise<string> | null = null;
/** Comparable-time dummy comparison so unknown accounts can't be detected through timing. */
export async function dummyVerify() {
  dummyHash ??= bcrypt.hash("dummy-password-for-timing", 12);
  await bcrypt.compare("not-the-password", await dummyHash);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function createSession(userId: string, remember: boolean) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? REMEMBER_DAYS * 86400_000 : SHORT_SESSION_HOURS * 3600_000));
  const h = await headers();
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      remember,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      ip: await clientIp(),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await prisma.session.deleteMany({
    where: { userId, ...(token ? { NOT: { tokenHash: hashToken(token) } } : {}) },
  });
}

export type SessionUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
  isStaff: boolean;
  permissions: Permission[];
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

  // Sliding expiration for short sessions + throttled activity tracking
  const now = Date.now();
  if (now - session.lastSeenAt.getTime() > 10 * 60_000) {
    const data: { lastSeenAt: Date; expiresAt?: Date } = { lastSeenAt: new Date() };
    if (!session.remember) data.expiresAt = new Date(now + SHORT_SESSION_HOURS * 3600_000);
    await prisma.session.update({ where: { id: session.id }, data }).catch(() => undefined);
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    fullName: u.fullName,
    role: u.role,
    isStaff: isStaffRole(u.role),
    permissions: [...permissionsFor(u.role, u.permissions)],
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireCustomer(): Promise<SessionUser> {
  const user = await requireUser();
  return user;
}

export async function requireStaff(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  if (!user.isStaff) throw forbidden();
  if (permission && !user.permissions.includes(permission)) throw forbidden("Permission insuffisante : " + permission);
  return user;
}

export function can(user: SessionUser | null, permission: Permission) {
  return !!user && user.isStaff && user.permissions.includes(permission);
}
