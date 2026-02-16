"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const heroSlides = [
  { src: "/hero/1_hero.png", alt: "Hero 1" },
  { src: "/hero/2_hero.png", alt: "Hero 2" },
  { src: "/hero/3_hero.png", alt: "Hero 3" },
  { src: "/hero/4_hero.png", alt: "Hero 4" },
];
const orderedSlides = [...heroSlides].reverse();
const HERO_COUNT = heroSlides.length;
const HERO_START_INDEX = orderedSlides.length - 1;
const ROTATION_MS = 8000;

export default function Hero() {
  const [index, setIndex] = useState(HERO_START_INDEX);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev - 1 + HERO_COUNT) % HERO_COUNT);
    }, ROTATION_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handleFocusIn = () => setPaused(true);
    const handleFocusOut = () => setPaused(false);
    node.addEventListener("focusin", handleFocusIn);
    node.addEventListener("focusout", handleFocusOut);
    return () => {
      node.removeEventListener("focusin", handleFocusIn);
      node.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero-bg max-w-6xl mx-auto px-6 pt-24 pb-8 mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div className="hero-lift md:col-span-2 bg-surface rounded-2xl shadow-soft p-0 flex flex-col gap-0 overflow-hidden" aria-label="Hero rotating content">
        <div className="hero-slide-track">
          {orderedSlides.map((slide) => (
            <Image
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              width={1200}
              height={520}
              className="hero-slide"
              style={{ transform: `translateX(-${index * 100}%)` }}
              sizes="100vw"
            />
          ))}
        </div>
      </div>
      <div className="rre-hero-slogan md:col-span-2">
        <div className="rre-hero-slogan-primary">Global Clean Energy.</div>
        <div className="rre-hero-slogan-secondary">Delivered with Certainty.</div>
      </div>
    </section>
  );
}
