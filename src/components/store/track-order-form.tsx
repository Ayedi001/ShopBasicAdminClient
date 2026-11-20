"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "./store-provider";
import { Field, FormAlert } from "./form-field";
import { OrderTimeline, StatusBadge } from "./order-status";
import { post, ApiError, errorMessage } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";

type Tracked = {
  number: string;
  status: string;
  createdAt: string;
  deliveryCompany: string | null;
  trackingNumber: string | null;
  history: { toStatus: string; createdAt: string }[];
  _count: { items: number };
};

export function TrackOrderForm() {
  const { t, locale } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Tracked | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const r = await post<{ order: Tracked }>("/api/track", { number: String(fd.get("number")), phone: String(fd.get("phone")) });
      setOrder(r.order);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? t("pages.trackNotFound") : errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const labels = Object.fromEntries(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => [s, t(`orderStatus.${s}`)]));

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={error} />
        <Field name="number" label={t("pages.orderNumber")} placeholder="CMD-261120-ABCDE" required autoComplete="off" />
        <Field name="phone" type="tel" label={t("auth.phone")} placeholder="98 123 456" required />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("pages.trackSubmit")}
        </button>
      </form>
      {order && (
        <div className="border border-neutral-200 p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg">{order.number}</span>
            <StatusBadge status={order.status} label={labels[order.status]} />
            <span className="text-[13px] text-ink-muted">{formatDate(order.createdAt, locale)}</span>
          </div>
          <OrderTimeline status={order.status} history={order.history} labels={labels} formatDate={(d) => formatDate(d, locale)} />
          {(order.deliveryCompany || order.trackingNumber) && (
            <p className="mt-5 text-[14px]">
              {order.deliveryCompany} {order.trackingNumber && <span className="font-mono">· {order.trackingNumber}</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
