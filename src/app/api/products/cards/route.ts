import { api } from "@/server/http";
import { getCardsByIds } from "@/server/catalog";
import { getI18n } from "@/server/i18n";

/** Product cards by ids (recently viewed products, stored client-side). */
export const GET = api(async (req) => {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]{10,40}$/i.test(s))
    .slice(0, 20);
  const { locale } = await getI18n();
  return { items: await getCardsByIds(ids, locale) };
});
