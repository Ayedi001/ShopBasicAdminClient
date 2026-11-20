import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export const isSqlite = () => (process.env.DATABASE_URL ?? "").startsWith("file:");

/**
 * Case-insensitive "contains" filter that works on both SQLite (LIKE is
 * already case-insensitive for ASCII) and PostgreSQL (needs mode).
 */
export function icontains(value: string) {
  return isSqlite() ? { contains: value } : { contains: value, mode: "insensitive" as const };
}
