"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** <img> with lazy loading and a neutral placeholder when the file is missing or broken. */
export function SafeImage({
  src,
  alt,
  className,
  eager,
  sizes,
  srcSet,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
  sizes?: string;
  srcSet?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-neutral-100 text-neutral-300", className)} role="img" aria-label={alt}>
        <ImageOff className="h-8 w-8" strokeWidth={1.2} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/** Build a srcset for an uploaded image ("…-lg.webp"). */
export function mediaSrcSet(url: string | null | undefined) {
  if (!url || !/-(sm|md|lg)\.webp$/.test(url)) return undefined;
  const base = url.replace(/-(sm|md|lg)\.webp$/, "");
  return `${base}-sm.webp 400w, ${base}-md.webp 800w, ${base}-lg.webp 1600w`;
}
