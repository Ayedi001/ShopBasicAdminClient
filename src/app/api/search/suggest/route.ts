import { api } from "@/server/http";
import { suggest } from "@/server/catalog";
import { getI18n } from "@/server/i18n";

export const GET = api(async (req) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const { locale } = await getI18n();
  if (q.trim().length < 2) return { products: [], categories: [], total: 0 };
  return suggest(q, locale);
});
