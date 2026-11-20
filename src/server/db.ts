import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * On Vercel + Prisma Postgres, prefer the pooled URL for serverless traffic
 * (DATABASE_URL_POOLED). Keep DATABASE_URL as the direct URL for
 * `prisma migrate deploy` during build.
 */
function databaseUrl() {
  return process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export const isSqlite = () => (process.env.DATABASE_URL ?? "").startsWith("file:");

/**
 * Case-insensitive "contains" — PostgreSQL needs `mode: "insensitive"`.
 * (SQLite local databases are no longer the supported path.)
 */
export function icontains(value: string) {
  if (isSqlite()) return { contains: value };
  return { contains: value, mode: "insensitive" as const };
}
