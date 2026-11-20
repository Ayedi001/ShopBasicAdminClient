import { api } from "@/server/http";
import { clientIp, requireStaff } from "@/server/auth/session";
import { MEDIA_FOLDERS, saveImage, type MediaFolder } from "@/server/media";
import { badRequest, forbidden } from "@/server/errors";
import { LIMITS, rateLimit } from "@/server/rate-limit";

/** Generic image upload for banners, categories, collections and store identity (logo, favicon). */
export const POST = api(async (req) => {
  const user = await requireStaff();
  if (!user.permissions.some((p) => ["content.manage", "settings.manage", "categories.manage", "products.manage"].includes(p))) {
    throw forbidden("Permission insuffisante");
  }
  rateLimit(`upload:${user.id}:${await clientIp()}`, LIMITS.upload.limit, LIMITS.upload.windowMs);
  const form = await req.formData();
  const file = form.get("file");
  const folder = (form.get("folder") as string) || "banners";
  if (!(MEDIA_FOLDERS as readonly string[]).includes(folder)) throw badRequest("INVALID_FOLDER", "Dossier invalide");
  if (!(file instanceof File) || !file.size) throw badRequest("NO_FILE", "Aucun fichier reçu");
  const media = await saveImage(Buffer.from(await file.arrayBuffer()), folder as MediaFolder);
  return { ok: true, ...media };
});
