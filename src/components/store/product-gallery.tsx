"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { ProductDetail } from "@/server/catalog";
import { SafeImage, mediaSrcSet } from "./safe-image";
import { useStore } from "./store-provider";
import { cn } from "@/lib/utils";

type Img = ProductDetail["images"][number];

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const { t } = useStore();
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [full, setFull] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const key = images.map((i) => i.id).join(",");

  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ left: 0 });
  }, [key]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full, images.length]);

  if (!images.length) {
    return <SafeImage src={null} alt={name} className="aspect-[4/5] w-full" />;
  }
  const current = images[Math.min(index, images.length - 1)];

  const renderMedia = (img: Img, cls: string, eager = false) =>
    img.kind === "VIDEO" ? (
      <video src={img.url} className={cls} controls playsInline muted loop preload="metadata" />
    ) : (
      <SafeImage src={img.url} srcSet={mediaSrcSet(img.url)} sizes="(min-width:1024px) 55vw, 100vw" alt={img.alt} eager={eager} className={cls} />
    );

  return (
    <div className="md:grid md:grid-cols-[84px_1fr] md:gap-4">
      {/* Thumbnails (desktop) */}
      <div className="scrollbar-none hidden max-h-[calc(100vh-140px)] flex-col gap-3 overflow-y-auto md:flex">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setIndex(i)}
            className={cn("relative aspect-[4/5] w-full shrink-0 overflow-hidden ring-1 transition", i === index ? "ring-brand" : "ring-transparent hover:ring-neutral-300")}
            aria-label={t("product.photo", { n: i + 1 })}
            aria-current={i === index}
          >
            <SafeImage src={img.thumbUrl} alt="" className="h-full w-full object-cover" />
            {img.kind === "VIDEO" && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white">{t("product.video")}</span>}
          </button>
        ))}
      </div>

      {/* Main image with hover zoom (desktop) */}
      <div className="relative hidden md:block">
        <div
          className={cn("relative aspect-[4/5] overflow-hidden bg-neutral-100", current.kind === "IMAGE" && "cursor-zoom-in")}
          onMouseMove={(e) => {
            if (current.kind !== "IMAGE") return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => current.kind === "IMAGE" && setFull(true)}
        >
          {current.kind === "VIDEO" ? (
            renderMedia(current, "h-full w-full object-cover")
          ) : (
            <SafeImage
              src={current.url}
              srcSet={mediaSrcSet(current.url)}
              sizes="55vw"
              alt={current.alt}
              eager
              className="h-full w-full object-cover transition-transform duration-200"
              key={current.id}
            />
          )}
          {zoom && current.kind === "IMAGE" && (
            <div
              className="pointer-events-none absolute inset-0 bg-no-repeat"
              style={{ backgroundImage: `url(${current.url})`, backgroundSize: "220%", backgroundPosition: `${zoom.x}% ${zoom.y}%` }}
              aria-hidden
            />
          )}
        </div>
        <button onClick={() => setFull(true)} className="absolute end-4 top-4 flex items-center gap-2 bg-white/90 px-3 py-2 text-[12px] uppercase tracking-wider hover:bg-white">
          <Expand className="h-4 w-4" /> {t("product.fullscreen")}
        </button>
        {images.length > 1 && (
          <>
            <button onClick={() => setIndex((index - 1 + images.length) % images.length)} className="absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/85 hover:bg-white" aria-label={t("common.previous")}>
              <ChevronLeft className="flip-rtl h-5 w-5" />
            </button>
            <button onClick={() => setIndex((index + 1) % images.length)} className="absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/85 hover:bg-white" aria-label={t("common.next")}>
              <ChevronRight className="flip-rtl h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Mobile swipe gallery */}
      <div className="relative -mx-4 sm:-mx-6 md:hidden">
        <div
          ref={scroller}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
        >
          {images.map((img, i) => (
            <div key={img.id} className="aspect-[4/5] w-full shrink-0 snap-center bg-neutral-100" onClick={() => img.kind === "IMAGE" && (setIndex(i), setFull(true))}>
              {renderMedia(img, "h-full w-full object-cover", i === 0)}
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <span key={img.id} className={cn("h-1.5 w-1.5 rounded-full", i === index ? "bg-ink" : "bg-ink/25")} />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      {full && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={name}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-ink-muted">
              {index + 1} / {images.length}
            </span>
            <button onClick={() => setFull(false)} className="p-2" aria-label={t("common.close")}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            {renderMedia(current, "max-h-full max-w-full object-contain")}
            {images.length > 1 && (
              <>
                <button onClick={() => setIndex((index - 1 + images.length) % images.length)} className="absolute start-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/90 shadow" aria-label={t("common.previous")}>
                  <ChevronLeft className="flip-rtl h-6 w-6" />
                </button>
                <button onClick={() => setIndex((index + 1) % images.length)} className="absolute end-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/90 shadow" aria-label={t("common.next")}>
                  <ChevronRight className="flip-rtl h-6 w-6" />
                </button>
              </>
            )}
          </div>
          <div className="scrollbar-none flex justify-center gap-2 overflow-x-auto p-3">
            {images.map((img, i) => (
              <button key={img.id} onClick={() => setIndex(i)} className={cn("h-20 w-16 shrink-0 overflow-hidden ring-1", i === index ? "ring-brand" : "ring-transparent")}>
                <SafeImage src={img.thumbUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
