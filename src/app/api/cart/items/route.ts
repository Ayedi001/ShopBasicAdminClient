import { api, parseBody } from "@/server/http";
import { cartAddSchema } from "@/lib/validation";
import { addToCart, currentCartView } from "@/server/cart";
import { getI18n } from "@/server/i18n";

export const POST = api(async (req) => {
  const input = await parseBody(req, cartAddSchema);
  await addToCart(input.variantId, input.quantity);
  const { locale } = await getI18n();
  return { cart: await currentCartView(locale) };
});
