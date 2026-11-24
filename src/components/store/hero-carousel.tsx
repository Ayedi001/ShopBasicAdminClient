"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage, mediaSrcSet } from "./safe-image";
import { cn } from "@/lib/utils";

export type HeroSlide = { id: string; title: string; subtitle: string | null; cta: string | null; href: string; image: string };

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(id);
  }, [count, paused]);

  if (!count) return null;
  return (
    <section
      className="relative h-[56vh] min-h-[380px] max-h-[560px] w-full overflow-hidden bg-neutral-200"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={cn("absolute inset-0 transition-opacity duration-1000", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          aria-hidden={i !== index}
        >
          <SafeImage src={s.image} srcSet={mediaSrcSet(s.image)} sizes="100vw" alt={s.title} eager={i === 0} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="container-x absolute inset-x-0 bottom-0 pb-16 text-white lg:pb-24">
            <div className="max-w-xl">
              <h2 className="h-display text-4xl leading-[1.05] sm:text-5xl lg:text-7xl">{s.title}</h2>
              {s.subtitle && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/90 sm:text-base">{s.subtitle}</p>}
              {s.cta && (
                <Link href={s.href} className="btn mt-7 bg-white text-ink hover:bg-white/85" tabIndex={i === index ? 0 : -1}>
                  {s.cta}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
      {count > 1 && (
        <>
          <div className="absolute bottom-6 end-6 flex items-center gap-2 lg:end-10">
            <button onClick={() => setIndex((index - 1 + count) % count)} className="flex h-10 w-10 items-center justify-center border border-white/50 text-white hover:bg-white/15" aria-label="Précédent">
              <ChevronLeft className="flip-rtl h-5 w-5" />
            </button>
            <button onClick={() => setIndex((index + 1) % count)} className="flex h-10 w-10 items-center justify-center border border-white/50 text-white hover:bg-white/15" aria-label="Suivant">
              <ChevronRight className="flip-rtl h-5 w-5" />
            </button>
          </div>
          <div className="absolute bottom-7 start-1/2 flex -translate-x-1/2 gap-2 rtl:translate-x-1/2">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => setIndex(i)} className={cn("h-0.5 w-8 transition", i === index ? "bg-white" : "bg-white/40")} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
