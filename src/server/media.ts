import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { badRequest } from "./errors";
import { getSupabaseAdmin, isSupabaseStorageEnabled, supabaseBucket, supabasePublicUrl } from "./supabase";

/**
 * Media storage with automatic Supabase Storage support.
 * - When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, files are uploaded
 *   to the configured Supabase Storage bucket (default: "media") and served via
 *   public Supabase CDN URLs (persistent on Vercel).
 * - Otherwise, files fall back to local disk in UPLOAD_DIR and are served by
 *   src/app/media/[...path]/route.ts.
 */

export const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
const MAX_IMAGE = () => Number(process.env.MAX_IMAGE_UPLOAD_MB ?? 8) * 1024 * 1024;
const MAX_VIDEO = () => Number(process.env.MAX_VIDEO_UPLOAD_MB ?? 50) * 1024 * 1024;

export const MEDIA_FOLDERS = ["products", "banners", "categories", "store", "reviews", "collections"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

const IMAGE_SIZES = { sm: 400, md: 800, lg: 1600 } as const;
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "heif"]);

export type StoredMedia = {
  kind: "IMAGE" | "VIDEO";
  storageKey: string;
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
};

async function putFile(relPath: string, data: Buffer, contentType: string) {
  if (isSupabaseStorageEnabled()) {
    const { error } = await getSupabaseAdmin()
      .storage.from(supabaseBucket())
      .upload(relPath, data, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) {
      throw badRequest("UPLOAD_FAILED", `Échec de l'envoi vers Supabase Storage : ${error.message}`);
    }
    return;
  }
  const abs = path.join(uploadRoot(), relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
}

function mediaUrl(relPath: string): string {
  return isSupabaseStorageEnabled() ? supabasePublicUrl(relPath) : `/media/${relPath}`;
}

function newKey(folder: MediaFolder, sub?: string) {
  const id = crypto.randomBytes(9).toString("base64url").replace(/[^A-Za-z0-9]/g, "x");
  const safeSub = sub ? sub.replace(/[^A-Za-z0-9_-]/g, "") : "";
  return [folder, safeSub, `${Date.now().toString(36)}-${id}`].filter(Boolean).join("/");
}

/** Validates, auto-rotates, strips metadata and writes 3 optimised WebP renditions. */
export async function saveImage(data: Buffer, folder: MediaFolder, sub?: string): Promise<StoredMedia> {
  if (data.length > MAX_IMAGE()) throw badRequest("FILE_TOO_LARGE", `Image trop lourde (max ${MAX_IMAGE() / 1024 / 1024} Mo)`);
  let meta: sharp.Metadata;
  try {
    meta = await sharp(data, { failOn: "error" }).metadata();
  } catch {
    throw badRequest("INVALID_IMAGE", "Le fichier n'est pas une image valide");
  }
  if (!meta.format || !ALLOWED_IMAGE_FORMATS.has(meta.format)) {
    throw badRequest("INVALID_IMAGE_TYPE", "Formats acceptés : JPEG, PNG, WebP, AVIF, GIF");
  }
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 200) {
    throw badRequest("IMAGE_TOO_SMALL", "Image trop petite (minimum 200×200 px)");
  }
  if ((meta.width ?? 0) * (meta.height ?? 0) > 60_000_000) throw badRequest("IMAGE_TOO_BIG", "Dimensions d'image trop grandes");

  const key = newKey(folder, sub);
  let lgInfo: sharp.OutputInfo | null = null;
  for (const [suffix, width] of Object.entries(IMAGE_SIZES)) {
    const { data: out, info } = await sharp(data)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: suffix === "sm" ? 74 : 82 })
      .toBuffer({ resolveWithObject: true });
    await putFile(`${key}-${suffix}.webp`, out, "image/webp");
    if (suffix === "lg") lgInfo = info;
  }
  return {
    kind: "IMAGE",
    storageKey: key,
    url: mediaUrl(`${key}-lg.webp`),
    thumbUrl: mediaUrl(`${key}-sm.webp`),
    width: lgInfo?.width ?? null,
    height: lgInfo?.height ?? null,
  };
}

function detectVideo(data: Buffer): "mp4" | "webm" | null {
  if (data.length > 12 && data.subarray(4, 8).toString("ascii") === "ftyp") return "mp4";
  if (data.length > 4 && data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) return "webm";
  return null;
}

export async function saveVideo(data: Buffer, folder: MediaFolder, sub?: string): Promise<StoredMedia> {
  if (data.length > MAX_VIDEO()) throw badRequest("FILE_TOO_LARGE", `Vidéo trop lourde (max ${MAX_VIDEO() / 1024 / 1024} Mo)`);
  const ext = detectVideo(data);
  if (!ext) throw badRequest("INVALID_VIDEO", "Formats vidéo acceptés : MP4, WebM");
  const key = newKey(folder, sub);
  await putFile(`${key}.${ext}`, data, ext === "mp4" ? "video/mp4" : "video/webm");
  const url = mediaUrl(`${key}.${ext}`);
  return { kind: "VIDEO", storageKey: key, url, thumbUrl: url, width: null, height: null };
}

export async function saveUpload(file: File, folder: MediaFolder, sub?: string, allowVideo = false): Promise<StoredMedia> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (allowVideo && (file.type.startsWith("video/") || detectVideo(buf))) return saveVideo(buf, folder, sub);
  return saveImage(buf, folder, sub);
}

export async function removeMedia(storageKey: string) {
  if (!storageKey || storageKey.includes("..") || storageKey.startsWith("public/")) return;
  if (isSupabaseStorageEnabled()) {
    const candidates = [`${storageKey}-sm.webp`, `${storageKey}-md.webp`, `${storageKey}-lg.webp`, `${storageKey}.mp4`, `${storageKey}.webm`];
    await getSupabaseAdmin().storage.from(supabaseBucket()).remove(candidates).catch(() => undefined);
    return;
  }
  const dir = path.join(uploadRoot(), path.dirname(storageKey));
  const base = path.basename(storageKey);
  try {
    const files = await fs.readdir(dir);
    await Promise.all(files.filter((f) => f.startsWith(base + "-") || f.startsWith(base + ".")).map((f) => fs.unlink(path.join(dir, f))));
  } catch {
    /* already gone */
  }
}

/** Card-sized rendition for an image URL produced by saveImage (falls back to the given URL). */
export function mediaVariant(url: string | null | undefined, size: "sm" | "md" | "lg"): string | null {
  if (!url) return null;
  return url.replace(/-(sm|md|lg)\.webp$/, `-${size}.webp`);
}
