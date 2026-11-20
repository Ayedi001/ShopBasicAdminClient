import { api } from "@/server/http";
import { currentCartView } from "@/server/cart";
import { getI18n } from "@/server/i18n";

export const dynamic = "force-dynamic";

export const GET = api(async () => {
  const { locale } = await getI18n();
  return { cart: await currentCartView(locale) };
});
