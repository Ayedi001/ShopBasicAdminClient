"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useStore } from "./store-provider";
import { CartLines, FreeShippingBar } from "./cart-lines";

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setCart, t, money, user } = useStore();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  const empty = !cart || cart.lines.length === 0;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("cart.title")}>
      <div className="absolute inset-0 animate-fadeIn bg-black/40" onClick={() => setCartOpen(false)} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-[440px] animate-slideInRight flex-col bg-white rtl:animate-slideInLeft">
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.16em]">
            {t("cart.title")} {cart && cart.count > 0 && <span className="text-ink-muted">({cart.count})</span>}
          </h2>
          <button onClick={() => setCartOpen(false)} className="-me-2 p-2" aria-label={t("common.close")}>
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag className="h-10 w-10 text-ink-faint" strokeWidth={1.2} />
            <p className="font-display text-2xl">{t("cart.empty")}</p>
            <p className="text-sm text-ink-muted">{t("cart.emptyHint")}</p>
            <button onClick={() => setCartOpen(false)} className="btn-primary mt-2">
              {t("common.continueShopping")}
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-neutral-100 px-5 py-4">
              <FreeShippingBar cart={cart} />
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines cart={cart} onCart={setCart} compact />
            </div>
            <div className="space-y-3 border-t border-neutral-200 px-5 py-5">
              {cart.promoSavings > 0 && (
                <div className="flex justify-between text-[14px] text-sale">
                  <span>{t("cart.discount")}</span>
                  <span>-{money(cart.promoSavings)}</span>
                </div>
              )}
              {cart.coupon && (
                <div className="flex justify-between text-[14px] text-sale">
                  <span>{cart.coupon.code}</span>
                  <span>-{money(cart.coupon.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-medium">
                <span>{t("cart.subtotal")}</span>
                <span>{money(cart.total)}</span>
              </div>
              <p className="text-[12px] text-ink-muted">{t("cart.shippingAtCheckout")}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/cart" onClick={() => setCartOpen(false)} className="btn-outline">
                  {t("common.cart")}
                </Link>
                <Link href={user ? "/checkout" : "/login?next=/checkout"} onClick={() => setCartOpen(false)} className="btn-primary">
                  {t("cart.checkout")}
                </Link>
              </div>
              {!user && <p className="text-center text-[12px] text-ink-muted">{t("cart.loginToOrder")}</p>}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
