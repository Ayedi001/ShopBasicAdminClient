import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { contentPageSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { badRequest } from "@/server/errors";
import { CONTENT_PAGES, LOCALES } from "@/lib/constants";
import { audit } from "@/server/audit";

export const PUT = api<{ slug: string; locale: string }>(async (req, ctx) => {
  const user = await requireStaff("content.manage");
  const { slug, locale } = await ctx.params;
  if (!(CONTENT_PAGES as readonly string[]).includes(slug) || !(LOCALES as readonly string[]).includes(locale)) {
    throw badRequest("INVALID_PAGE", "Page inconnue");
  }
  const input = await parseBody(req, contentPageSchema);
  await prisma.contentPage.upsert({
    where: { slug_locale: { slug, locale } },
    create: { slug, locale, ...input },
    update: input,
  });
  await audit(user, "content.page", "ContentPage", `${slug}:${locale}`);
  return { ok: true };
});
