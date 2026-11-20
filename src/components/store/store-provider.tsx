"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CartView } from "@/server/cart";
import { createT, type Dictionary, type TFunction } from "@/i18n";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { apiFetch, post, ApiError, errorMessage } from "@/lib/client-api";

export type ClientUser = { id: string; fullName: string; email: string; phone: string; isStaff: boolean };
type Toast = { id: number; message: string; tone: "success" | "error" | "info"; action?: { label: string; href: string } };

type StoreCtx = {
  locale: string;
  t: TFunction;
  dict: Dictionary;
  currency: CurrencyConfig;
  currencies: CurrencyConfig[];
  money: (millimes: number) => string;
  user: ClientUser | null;
  unread: number;
  wishlist: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  cart: CartView | null;
  cartCount: number;
  setCart: (c: CartView) => void;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: string, quantity: number) => Promise<boolean>;
  cartOpen: boolean;
  setCartOpen: (o: boolean) => void;
  toast: (message: string, tone?: Toast["tone"], action?: Toast["action"]) => void;
  setPreference: (p: { locale?: string; currency?: string }) => Promise<void>;
  storeName: string;
};

const Ctx = createContext<StoreCtx | null>(null);

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

export function StoreProvider({
  children,
  locale,
  dict,
  currency,
  currencies,
  initialUser,
  storeName,
}: {
  children: React.ReactNode;
  locale: string;
  dict: Dictionary;
  currency: CurrencyConfig;
  currencies: CurrencyConfig[];
  initialUser: ClientUser | null;
  storeName: string;
}) {
  const router = useRouter();
  const t = useMemo(() => createT(dict), [dict]);
  const money = useCallback((m: number) => formatMoney(m, currency, locale), [currency, locale]);
  const [user, setUser] = useState<ClientUser | null>(initialUser);
  const [unread, setUnread] = useState(0);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<CartView | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success", action?: Toast["action"]) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-2), { id, message, tone, action }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4500);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiFetch<{ user: ClientUser | null; unread?: number; wishlist?: string[] }>("/api/auth/me", { cache: "no-store" });
      setUser(me.user);
      setUnread(me.unread ?? 0);
      setWishlist(new Set(me.wishlist ?? []));
    } catch {
      /* offline: keep current state */
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const r = await apiFetch<{ cart: CartView }>("/api/cart", { cache: "no-store" });
      setCart(r.cart);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshMe();
    void refreshCart();
  }, [refreshMe, refreshCart]);

  const addToCart = useCallback(
    async (variantId: string, quantity: number) => {
      try {
        const r = await post<{ cart: CartView }>("/api/cart/items", { variantId, quantity });
        setCart(r.cart);
        setCartOpen(true);
        return true;
      } catch (e) {
        toast(errorMessage(e, t), "error");
        return false;
      }
    },
    [t, toast],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        toast(t("product.loginForWishlist"), "info", { label: t("common.login"), href: `/login?next=${encodeURIComponent(location.pathname)}` });
        return;
      }
      try {
        const r = await post<{ inWishlist: boolean }>("/api/wishlist", { productId });
        setWishlist((s) => {
          const n = new Set(s);
          if (r.inWishlist) n.add(productId);
          else n.delete(productId);
          return n;
        });
        toast(r.inWishlist ? t("product.addToWishlist") + " ✓" : t("product.removeFromWishlist") + " ✓", "info");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) setUser(null);
        toast(errorMessage(e, t), "error");
      }
    },
    [user, t, toast],
  );

  const setPreference = useCallback(
    async (p: { locale?: string; currency?: string }) => {
      await post("/api/preferences", p);
      router.refresh();
      void refreshCart();
    },
    [router, refreshCart],
  );

  const value: StoreCtx = {
    locale,
    t,
    dict,
    currency,
    currencies,
    money,
    user,
    unread,
    wishlist,
    toggleWishlist,
    refreshMe,
    cart,
    cartCount: cart?.count ?? 0,
    setCart,
    refreshCart,
    addToCart,
    cartOpen,
    setCartOpen,
    toast,
    setPreference,
    storeName,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((x) => (
          <div
            key={x.id}
            className={`pointer-events-auto flex max-w-md animate-slideUp items-center gap-4 px-5 py-3 text-sm shadow-lg ${
              x.tone === "error" ? "bg-sale text-white" : x.tone === "info" ? "bg-white text-ink ring-1 ring-neutral-200" : "bg-brand text-white"
            }`}
          >
            <span>{x.message}</span>
            {x.action && (
              <a href={x.action.href} className="shrink-0 font-medium underline underline-offset-4">
                {x.action.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
