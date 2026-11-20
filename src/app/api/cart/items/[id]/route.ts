import { api, parseBody } from "@/server/http";
import { cartUpdateSchema } from "@/lib/validation";
import { currentCartView, updateCartItem } from "@/server/cart";
import { getI18n } from "@/server/i18n";

export const PATCH = api<{ id: string }>(async (req, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, cartUpdateSchema);
  await updateCartItem(id, input.quantity);
  const { locale } = await getI18n();
  return { cart: await currentCartView(locale) };
});

export const DELETE = api<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await updateCartItem(id, 0);
  const { locale } = await getI18n();
  return { cart: await currentCartView(locale) };
});
