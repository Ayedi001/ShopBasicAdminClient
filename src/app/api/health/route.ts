import { prisma } from "@/server/db";
import fs from "node:fs/promises";
import { uploadRoot } from "@/server/media";
import { getSupabaseAdmin, isSupabaseStorageEnabled, supabaseBucket } from "@/server/supabase";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for monitoring (uptime checks, load balancers, Docker HEALTHCHECK). */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, string> = {};
  let ok = true;
  try {
    await prisma.setting.count();
    checks.database = "ok";
  } catch {
    checks.database = "error";
    ok = false;
  }
  try {
    if (isSupabaseStorageEnabled()) {
      const { error } = await getSupabaseAdmin().storage.from(supabaseBucket()).list("", { limit: 1 });
      if (error) throw error;
    } else {
      await fs.mkdir(uploadRoot(), { recursive: true });
      await fs.access(uploadRoot());
    }
    checks.storage = "ok";
  } catch {
    checks.storage = "error";
    ok = false;
  }
  return Response.json(
    { status: ok ? "ok" : "degraded", checks, uptimeSeconds: Math.round(process.uptime()), latencyMs: Date.now() - started, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
