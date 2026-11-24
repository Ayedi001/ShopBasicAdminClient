"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, MapPin, Phone, Store, Truck } from "lucide-react";
import type { CartView } from "@/server/cart";
import { useStore } from "./store-provider";
import { Field, FormAlert, TextArea } from "./form-field";
import { SafeImage } from "./safe-image";
import { post, ApiError, errorMessage, resolveFieldErrors } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Region = { id: string; name: string; nameAr: string | null; fee: number; estimatedDays: string | null };
type Quote = {
  cart: CartView;
  subtotal: number;
  promoSavings: number;
  couponDiscount: number;
  couponCode: string | null;
  couponError: string | null;
  shippingFee: number;
  estimatedDays: string | null;
  shippingError: string | null;
  total: number;
};
type Initial = { fullName: string; phone: string; address: string; city: string; regionId: string; postalCode: string; deliveryInstructions: string };

export function CheckoutForm({
  initial,
  regions,
  pickupEnabled,
  pickupAddress,
  pickupHours,
  paymentNote,
}: {
  initial: Initial;
  regions: Region[];
  pickupEnabled: boolean;
  pickupAddress: string;
  pickupHours: string;
  paymentNote: string;
}) {
  const { t, money, locale, refreshCart } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ ...initial, deliveryMethod: "DELIVERY" as "DELIVERY" | "PICKUP", saveAddress: true });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const loadQuote = useCallback(async () => {
    setLoadingQuote(true);
    try {
      const q = await post<Quote>("/api/checkout/quote", { deliveryMethod: form.deliveryMethod, regionId: form.regionId });
      setQuote(q);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setLoadingQuote(false);
    }
  }, [form.deliveryMethod, form.regionId, t]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.fullName.trim().length < 3) errs.fullName = t("err.nameShort");
    const digits = form.phone.replace(/\D/g, "");
    if (!(digits.length === 8 || (digits.length === 11 && digits.startsWith("216")))) errs.phone = t("err.phone");
    if (form.deliveryMethod === "DELIVERY") {
      if (form.address.trim().length < 5) errs.address = t("err.address");
      if (form.city.trim().length < 2) errs.city = t("err.required");
      if (!form.regionId) errs.regionId = t("err.required");
    }
    setFields(errs);
    return Object.keys(errs).length === 0;
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate() || !quote) return;
    if (quote.shippingError) {
      setFields({ regionId: quote.shippingError });
      return;
    }
    setBusy(true);
    try {
      const r = await post<{ number: string }>("/api/checkout/place", {
        fullName: form.fullName,
        phone: form.phone,
        deliveryMethod: form.deliveryMethod,
        address: form.address,
        city: form.city,
        regionId: form.regionId,
        postalCode: form.postalCode || null,
        deliveryInstructions: form.deliveryInstructions || null,
        couponCode: quote.couponCode,
        saveAddress: form.saveAddress,
        expectedTotal: quote.total,
      });
      await refreshCart();
      router.push(`/checkout/success/${r.number}`);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError) {
        if (["TOTAL_CHANGED", "CART_CHANGED", "OUT_OF_STOCK"].includes(err.code)) {
          await loadQuote();
          await refreshCart();
          setError(err.code === "TOTAL_CHANGED" ? t("checkout.totalChanged") : err.message);
          return;
        }
        if (err.fields) {
          setFields(resolveFieldErrors(err.fields, t));
        }
      }
      setError(errorMessage(err, t));
    }
  };

  if (!loadingQuote && quote && quote.cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="h-display text-3xl">{t("checkout.emptyCart")}</p>
        <Link href="/shop" className="btn-primary mt-6">
          {t("common.continueShopping")}
        </Link>
      </div>
    );
  }

  const region = regions.find((r) => r.id === form.regionId);
  const unavailable = quote?.cart.lines.some((l) => l.issue === "UNAVAILABLE");

  const summary = (
    <aside className="h-fit bg-paper p-6 lg:sticky lg:top-24">
      <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.14em]">{t("checkout.summary")}</h2>
      {!quote ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-faint" />
      ) : (
        <>
          <ul className="max-h-80 space-y-4 overflow-y-auto">
            {quote.cart.lines.map((l) => (
              <li key={l.id} className={cn("flex gap-3 text-[13px]", l.issue === "UNAVAILABLE" && "opacity-50")}>
                <div className="relative shrink-0">
                  <SafeImage src={l.image} alt={l.name} className="h-20 w-16 object-cover" />
                  <span className="absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">{l.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2">{l.name}</p>
                  <p className="text-ink-muted">{[l.colorName, l.sizeLabel].filter(Boolean).join(" · ")}</p>
                  {l.issue && <p className="text-sale">{l.issue === "UNAVAILABLE" ? t("cart.itemUnavailable") : l.issue === "REDUCED" ? t("cart.quantityReduced", { n: l.quantity }) : t("cart.priceChanged")}</p>}
                </div>
                <span className="shrink-0">{money(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-neutral-200 pt-4 text-[14px]">
            <div className="flex justify-between">
              <dt>{t("cart.subtotal")}</dt>
              <dd>{money(quote.subtotal + quote.promoSavings)}</dd>
            </div>
            {quote.promoSavings > 0 && (
              <div className="flex justify-between text-sale">
                <dt>{t("cart.discount")}</dt>
                <dd>-{money(quote.promoSavings)}</dd>
              </div>
            )}
            {quote.couponDiscount > 0 && (
              <div className="flex justify-between text-sale">
                <dt>{quote.couponCode}</dt>
                <dd>-{money(quote.couponDiscount)}</dd>
              </div>
            )}
            {quote.couponError && <p className="text-[13px] text-sale">{quote.couponError}</p>}
            <div className="flex justify-between">
              <dt>{t("cart.shipping")}</dt>
              <dd>{loadingQuote ? "…" : quote.shippingError ? "—" : quote.shippingFee === 0 ? t("checkout.free") : money(quote.shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-[17px] font-medium">
              <dt>{t("cart.total")}</dt>
              <dd>{money(quote.total)}</dd>
            </div>
          </dl>
          {quote.estimatedDays && !quote.shippingError && <p className="mt-3 text-[13px] text-ink-muted">{t("checkout.estimatedDelivery", { time: quote.estimatedDays })}</p>}
        </>
      )}
    </aside>
  );

  return (
    <form onSubmit={submitOrder} className="grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="space-y-8">
        <h1 className="h-display text-4xl">{t("checkout.title")}</h1>
        <FormAlert message={error} />
        <section className="space-y-4">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">1. {t("checkout.contact")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label={t("checkout.fullName")} value={form.fullName} onChange={set("fullName")} autoComplete="name" required error={fields.fullName} />
            <Field name="phone" type="tel" inputMode="tel" label={t("checkout.phone")} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="98 123 456" required error={fields.phone} />
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">2. {t("checkout.delivery")}</h2>
          {pickupEnabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["DELIVERY", Truck, t("checkout.homeDelivery"), region ? `${region.estimatedDays ?? ""}` : ""],
                  ["PICKUP", Store, t("checkout.pickup"), pickupHours],
                ] as const
              ).map(([value, Icon, label, sub]) => (
                <label key={value} className={cn("flex cursor-pointer items-start gap-3 border p-4 transition", form.deliveryMethod === value ? "border-brand ring-1 ring-brand" : "border-neutral-300 hover:border-neutral-500")}>
                  <input type="radio" name="deliveryMethod" value={value} checked={form.deliveryMethod === value} onChange={() => setForm((f) => ({ ...f, deliveryMethod: value }))} className="mt-1 accent-[rgb(var(--brand))]" />
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
                  <span>
                    <span className="block text-[14px] font-medium">{label}</span>
                    {sub && <span className="block text-[13px] text-ink-muted">{sub}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
          {form.deliveryMethod === "DELIVERY" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="f-regionId" className="label">
                  {t("checkout.region")}
                </label>
                <select id="f-regionId" value={form.regionId} onChange={set("regionId")} className={cn("input", fields.regionId && "input-error")} required>
                  <option value="">{t("checkout.selectRegion")}</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {locale === "ar" && r.nameAr ? r.nameAr : r.name} — {money(r.fee)}
                    </option>
                  ))}
                </select>
                {fields.regionId && <p className="field-error">{fields.regionId}</p>}
              </div>
              <Field name="address" className="sm:col-span-2" label={t("checkout.address")} value={form.address} onChange={set("address")} autoComplete="street-address" required error={fields.address} />
              <Field name="city" label={t("checkout.city")} value={form.city} onChange={set("city")} autoComplete="address-level2" required error={fields.city} />
              <Field name="postalCode" label={`${t("checkout.postalCode")} (${t("common.optional")})`} value={form.postalCode} onChange={set("postalCode")} autoComplete="postal-code" inputMode="numeric" maxLength={10} />
              <TextArea name="deliveryInstructions" className="sm:col-span-2" rows={2} maxLength={500} label={`${t("checkout.instructions")} (${t("common.optional")})`} value={form.deliveryInstructions} onChange={set("deliveryInstructions")} />
              <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
                <input type="checkbox" checked={form.saveAddress} onChange={(e) => setForm((f) => ({ ...f, saveAddress: e.target.checked }))} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                {t("checkout.saveAddress")}
              </label>
            </div>
          ) : (
            <p className="flex items-start gap-3 bg-paper p-4 text-[14px]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {t("checkout.pickupAt", { address: pickupAddress })}
              {pickupHours ? ` — ${pickupHours}` : ""}
            </p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">3. {t("checkout.paymentMethod")}</h2>
          <p className="border border-neutral-200 p-4 text-[14px] text-neutral-700">{paymentNote}</p>
          <div className="flex gap-3 border border-brand-accent/40 bg-brand-soft p-4 text-[13px]">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
            <p>{t("checkout.reviewText")}</p>
          </div>
        </section>
        <button className="btn-primary h-14 w-full text-[14px]" disabled={busy || loadingQuote || !quote || !!unavailable || !!quote.shippingError}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("checkout.placing")}
            </>
          ) : quote ? (
            `${t("checkout.placeOrder")} — ${money(quote.total)}`
          ) : (
            t("checkout.placeOrder")
          )}
        </button>
        {unavailable && (
          <p className="flex items-center gap-2 text-[14px] text-sale">
            <AlertTriangle className="h-4 w-4" /> {t("cart.itemUnavailable")}{" "}
            <Link href="/cart" className="underline">
              {t("common.cart")}
            </Link>
          </p>
        )}
      </div>
      {summary}
    </form>
  );
}
