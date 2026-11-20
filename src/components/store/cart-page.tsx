"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, ShoppingBag, Tag, X } from "lucide-react";
import type { CartView } from "@/server/cart";
import { useStore } from "./store-provider";
import { CartLines, FreeShippingBar } from "./cart-lines";
import { post, del, errorMessage } from "@/lib/client-api";

export function CouponBox({ cart, onCart }: { cart: CartView; onCart: (c: CartView) => void }) {
  const { t, toast } = useStore();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ cart: CartView }>("/api/cart/coupon", { code: code.trim() });
      onCart(r.cart);
      setCode("");
      toast(t("cart.couponApplied", { code: r.cart.couponCode ?? code.toUpperCase() }));
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const r = await del<{ cart: CartView }>("/api/cart/coupon");
      onCart(r.cart);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (cart.couponCode) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between bg-brand-soft px-3 py-2 text-[14px]">
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4" /> {cart.couponCode}
          </span>
          <button onClick={remove} disabled={busy} className="p-1" aria-label={t("cart.removeCoupon")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {cart.couponError && <p className="text-[13px] text-sale">{cart.couponError}</p>}
      </div>
    );
  }
  return (
    <form onSubmit={apply}>
      <label htmlFor="coupon" className="label">
        {t("cart.couponCode")}
      </label>
      <div className="flex">
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input uppercase" placeholder="WELCOME10" maxLength={40} autoComplete="off" />
        <button className="btn-outline btn-sm shrink-0 border-s-0" disabled={busy || !code.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("cart.applyCoupon")}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </form>
  );
}

export function CartPage() {
  const { cart, setCart, refreshCart, t, money, user } = useStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    refreshCart().finally(() => setLoaded(true));
  }, [refreshCart]);

  if (!cart || (!loaded && !cart.lines.length)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-ink-faint" strokeWidth={1.2} />
        <h1 className="h-display mt-5 text-3xl">{t("cart.empty")}</h1>
        <p className="mt-2 text-ink-muted">{t("cart.emptyHint")}</p>
        <Link href="/shop" className="btn-primary mt-7">
          {t("common.continueShopping")}
        </Link>
      </div>
    );
  }

  const blocking = cart.lines.some((l) => l.issue === "UNAVAILABLE");

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="h-display text-4xl">
          {t("cart.title")} <span className="text-2xl text-ink-muted">({cart.count})</span>
        </h1>
        {cart.hasIssues && (
          <p className="mt-5 flex items-center gap-2 bg-amber-50 px-4 py-3 text-[14px] text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {t("cart.issues")}
          </p>
        )}
        <div className="mt-4 border-t border-neutral-200">
          <CartLines cart={cart} onCart={setCart} />
        </div>
        <Link href="/shop" className="link-underline mt-4 inline-block text-[14px]">
          ← {t("common.continueShopping")}
        </Link>
      </div>
      <aside className="h-fit space-y-5 bg-paper p-6 lg:sticky lg:top-24">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">{t("checkout.summary")}</h2>
        <FreeShippingBar cart={cart} />
        <CouponBox cart={cart} onCart={setCart} />
        <dl className="space-y-2 border-t border-neutral-200 pt-4 text-[14px]">
          <div className="flex justify-between">
            <dt>{t("cart.subtotal")}</dt>
            <dd>{money(cart.baseSubtotal)}</dd>
          </div>
          {cart.promoSavings > 0 && (
            <div className="flex justify-between text-sale">
              <dt>{t("cart.discount")}</dt>
              <dd>-{money(cart.promoSavings)}</dd>
            </div>
          )}
          {cart.coupon && (
            <div className="flex justify-between text-sale">
              <dt>{t("cart.couponCode")} ({cart.coupon.code})</dt>
              <dd>-{money(cart.coupon.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-ink-muted">
            <dt>{t("cart.shipping")}</dt>
            <dd>{t("cart.shippingAtCheckout")}</dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-3 text-[16px] font-medium">
            <dt>{t("cart.total")}</dt>
            <dd>{money(cart.total)}</dd>
          </div>
        </dl>
        <Link href={user ? "/checkout" : "/login?next=/checkout"} aria-disabled={blocking} className={`btn-primary w-full ${blocking ? "pointer-events-none opacity-50" : ""}`}>
          {t("cart.checkout")}
        </Link>
        {blocking && <p className="text-[13px] text-sale">{t("cart.itemUnavailable")}</p>}
        {!user && <p className="text-center text-[12px] text-ink-muted">{t("cart.loginToOrder")}</p>}
        <p className="text-center text-[12px] text-ink-muted">{t("product.paymentInfo")}</p>
      </aside>
    </div>
  );
}
