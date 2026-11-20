"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Minus, Plus, Trash2 } from "lucide-react";
import type { CartLine, CartView } from "@/server/cart";
import { useStore } from "./store-provider";
import { SafeImage } from "./safe-image";
import { Price } from "./product-card";
import { patch, del, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useStore();
  const h = size === "sm" ? "h-8" : "h-11";
  return (
    <div className={cn("inline-flex items-center border border-neutral-300", h)} role="group" aria-label={t("product.quantity")}>
      <button type="button" className="flex h-full w-9 items-center justify-center disabled:opacity-30" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label="-">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className="flex h-full w-9 items-center justify-center disabled:opacity-30" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="+">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LineRow({ line, onCart, compact }: { line: CartLine; onCart: (c: CartView) => void; compact?: boolean }) {
  const { t, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const unavailable = line.issue === "UNAVAILABLE";

  const update = async (quantity: number) => {
    setBusy(true);
    try {
      const r = quantity === 0 ? await del<{ cart: CartView }>(`/api/cart/items/${line.id}`) : await patch<{ cart: CartView }>(`/api/cart/items/${line.id}`, { quantity });
      onCart(r.cart);
      if (quantity === 0) toast(t("cart.removed"), "info");
    } catch (e) {
      toast(errorMessage(e, t), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={cn("flex gap-4 py-5", busy && "opacity-60")}>
      <Link href={`/p/${line.slug}`} className="shrink-0">
        <SafeImage src={line.image} alt={line.name} className={cn("object-cover", compact ? "h-28 w-22 w-[88px]" : "h-36 w-28")} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/p/${line.slug}`} className="line-clamp-2 text-[14px] leading-snug hover:underline">
            {line.name}
          </Link>
          <span className="shrink-0 text-[14px] font-medium">{!unavailable && <Price price={line.lineTotal} />}</span>
        </div>
        <div className="mt-1 space-y-0.5 text-[13px] text-ink-muted">
          {line.colorName && (
            <p className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15" style={{ backgroundColor: line.colorHex ?? undefined }} />
              {line.colorName}
            </p>
          )}
          {line.sizeLabel && (
            <p>
              {t("product.selectSize")} : {line.sizeLabel}
            </p>
          )}
          <p>
            <Price price={line.unitPrice} basePrice={line.basePrice} />
          </p>
        </div>
        {line.issue && (
          <p className={cn("mt-2 flex items-start gap-1.5 text-[13px]", unavailable ? "text-sale" : "text-amber-700")}>
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {line.issue === "UNAVAILABLE" ? t("cart.itemUnavailable") : line.issue === "REDUCED" ? t("cart.quantityReduced", { n: line.quantity }) : t("cart.priceChanged")}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          {unavailable ? <span /> : <QuantityStepper size="sm" value={line.quantity} max={Math.min(20, line.available)} onChange={update} disabled={busy} />}
          <button onClick={() => update(0)} disabled={busy} className="flex items-center gap-1 text-[12px] uppercase tracking-wider text-ink-muted hover:text-sale">
            <Trash2 className="h-3.5 w-3.5" /> {t("common.remove")}
          </button>
        </div>
      </div>
    </li>
  );
}

export function CartLines({ cart, onCart, compact }: { cart: CartView; onCart: (c: CartView) => void; compact?: boolean }) {
  return (
    <ul className="divide-y divide-neutral-200">
      {cart.lines.map((l) => (
        <LineRow key={l.id} line={l} onCart={onCart} compact={compact} />
      ))}
    </ul>
  );
}

export function FreeShippingBar({ cart }: { cart: CartView }) {
  const { t, money } = useStore();
  if (!cart.freeShippingThreshold || !cart.count) return null;
  const remaining = cart.freeShippingThreshold - cart.total;
  const pct = Math.min(100, Math.round((cart.total / cart.freeShippingThreshold) * 100));
  return (
    <div className="text-[13px]">
      <p className="mb-2">{remaining > 0 ? t("cart.freeShippingProgress", { amount: money(remaining) }) : t("cart.freeShippingReached")}</p>
      <div className="h-1 w-full bg-neutral-200">
        <div className="h-full bg-brand-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
