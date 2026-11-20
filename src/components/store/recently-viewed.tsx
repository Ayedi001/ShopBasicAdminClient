"use client";

import { useEffect, useState } from "react";
import type { ProductCardDTO } from "@/server/catalog";
import { apiFetch } from "@/lib/client-api";
import { ProductRail } from "./product-card";

const KEY = "ms_recent";

export function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 12) : [];
  } catch {
    return [];
  }
}

/** Records a product view (client-side only, no tracking cookies). */
export function TrackRecentlyViewed({ productId }: { productId: string }) {
  useEffect(() => {
    const list = [productId, ...readRecent().filter((id) => id !== productId)].slice(0, 12);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage full / disabled */
    }
  }, [productId]);
  return null;
}

export function RecentlyViewed({ title, excludeId }: { title: string; excludeId?: string }) {
  const [items, setItems] = useState<ProductCardDTO[]>([]);
  useEffect(() => {
    const ids = readRecent().filter((id) => id !== excludeId).slice(0, 8);
    if (!ids.length) return;
    apiFetch<{ items: ProductCardDTO[] }>(`/api/products/cards?ids=${ids.join(",")}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [excludeId]);
  if (!items.length) return null;
  return (
    <section className="container-x py-12">
      <h2 className="h-display mb-6 text-3xl">{title}</h2>
      <ProductRail products={items.slice(0, 4)} />
    </section>
  );
}
