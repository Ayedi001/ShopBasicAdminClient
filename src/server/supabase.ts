import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as { supabaseAdmin?: SupabaseClient };

function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function supabaseKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();
}

export function isSupabaseStorageEnabled(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

export function supabaseBucket(): string {
  return (process.env.SUPABASE_STORAGE_BUCKET ?? "media").trim() || "media";
}

/** Server-only Supabase client for Storage uploads (prefers service/secret key; falls back to publishable key). */
export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase Storage.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (process.env.NODE_ENV !== "production") globalForSupabase.supabaseAdmin = client;
  return client;
}

export function supabasePublicUrl(relPath: string): string {
  const base = supabaseUrl().replace(/\/+$/, "");
  const cleanPath = relPath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${encodeURIComponent(supabaseBucket())}/${cleanPath}`;
}
