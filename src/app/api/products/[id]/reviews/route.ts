import { api } from "@/server/http";
import { reviewSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/session";
import { createReview } from "@/server/reviews";
import { saveImage } from "@/server/media";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { badRequest } from "@/server/errors";

/** multipart/form-data: rating, title, body, photos[] (optional, max 4) */
export const POST = api<{ id: string }>(async (req, ctx) => {
  const user = await requireUser();
  rateLimit(`review:${user.id}`, LIMITS.review.limit, LIMITS.review.windowMs);
  const { id } = await ctx.params;
  const form = await req.formData().catch(() => {
    throw badRequest("INVALID_FORM", "Formulaire invalide");
  });
  const input = reviewSchema.parse({
    rating: Number(form.get("rating")),
    title: (form.get("title") as string) || null,
    body: (form.get("body") as string) ?? "",
  });
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  const photos = [];
  for (const f of files) {
    const saved = await saveImage(Buffer.from(await f.arrayBuffer()), "reviews");
    photos.push({ storageKey: saved.storageKey, url: saved.url, thumbUrl: saved.thumbUrl });
  }
  const review = await createReview(user, id, input, photos);
  return { ok: true, status: review.status };
});
