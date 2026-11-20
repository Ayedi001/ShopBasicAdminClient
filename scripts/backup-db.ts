/* eslint-disable no-console */
/**
 * Backup / restore helpers for the configured DATABASE_URL.
 *
 * SQLite (file:./dev.db):
 *   npx tsx scripts/backup-db.ts
 *   npx tsx scripts/backup-db.ts --restore backups/maison-shop-….db
 *
 * PostgreSQL:
 *   requires `pg_dump` / `psql` on PATH
 *   npx tsx scripts/backup-db.ts
 *   npx tsx scripts/backup-db.ts --restore backups/maison-shop-….sql
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const backupsDir = path.resolve(process.cwd(), "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function ensureDir() {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function sqlitePath(databaseUrl: string) {
  const m = databaseUrl.match(/^file:(.+)$/);
  if (!m) return null;
  const p = m[1];
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), "prisma", p.replace(/^\.\//, ""));
}

function backupSqlite(dbFile: string) {
  ensureDir();
  const dest = path.join(backupsDir, `maison-shop-${stamp}.db`);
  fs.copyFileSync(dbFile, dest);
  // also copy WAL/SHM if present
  for (const ext of ["-wal", "-shm"]) {
    const side = dbFile + ext;
    if (fs.existsSync(side)) fs.copyFileSync(side, dest + ext);
  }
  console.log(`SQLite backup → ${dest}`);
}

function restoreSqlite(dbFile: string, backup: string) {
  if (!fs.existsSync(backup)) {
    console.error(`Fichier introuvable : ${backup}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.copyFileSync(backup, dbFile);
  console.log(`SQLite restauré depuis ${backup}`);
}

function backupPostgres(databaseUrl: string) {
  ensureDir();
  const dest = path.join(backupsDir, `maison-shop-${stamp}.sql`);
  execFileSync("pg_dump", ["--no-owner", "--format=plain", `--file=${dest}`, databaseUrl], { stdio: "inherit" });
  console.log(`PostgreSQL backup → ${dest}`);
}

function restorePostgres(databaseUrl: string, backup: string) {
  if (!fs.existsSync(backup)) {
    console.error(`Fichier introuvable : ${backup}`);
    process.exit(1);
  }
  execFileSync("psql", [databaseUrl, "-f", backup], { stdio: "inherit" });
  console.log(`PostgreSQL restauré depuis ${backup}`);
}

function main() {
  if (!url) {
    console.error("DATABASE_URL manquant. Copiez .env.example vers .env");
    process.exit(1);
  }
  const restore = arg("restore");
  const sqlite = sqlitePath(url);

  if (sqlite) {
    if (restore) restoreSqlite(sqlite, path.resolve(restore));
    else backupSqlite(sqlite);
    return;
  }

  if (url.startsWith("postgres")) {
    if (restore) restorePostgres(url, path.resolve(restore));
    else backupPostgres(url);
    return;
  }

  console.error("DATABASE_URL non reconnu (attendu file:… ou postgres…).");
  process.exit(1);
}

main();
