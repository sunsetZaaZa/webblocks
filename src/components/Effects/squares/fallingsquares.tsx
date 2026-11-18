import React, { useEffect, useMemo, useRef, useState } from "react";
import "./fallingsquares.scss";

type SquareVariant = "outline" | "soft" | "ghost";

type Particle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  rotationStart: number;
  rotationEnd: number;
  flipXEnd: number;
  flipYEnd: number;
  opacity: number;
  blur: number;
  variant: SquareVariant;
};

type FallingSquaresProps = {
  className?: string;
  seed?: number;
  mobileCount?: number;
  desktopCount?: number;
  breakpoint?: number;
  enableParallax?: boolean;
  parallaxStrength?: number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickVariant(rand: () => number): SquareVariant {
  const r = rand();
  if (r < 0.4) return "outline";
  if (r < 0.8) return "soft";
  return "ghost";
}

function makeParticles(count: number, seed: number): Particle[] {
  const rand = mulberry32(seed);

  return Array.from({ length: count }, (_, i) => {
    const sizeBucket = rand();
    const size =
      sizeBucket < 0.55
        ? 8 + rand() * 10
        : sizeBucket < 0.9
          ? 14 + rand() * 12
          : 24 + rand() * 14;

    const rotationStart = rand() * 360;
    const rotationEnd = rotationStart + (1.5 + rand() * 3.5) * 360;

    const shouldFlip = rand() < 0.38;
    const flipAxisMode = rand();

    let flipXEnd = 0;
    let flipYEnd = 0;

    if (shouldFlip) {
      if (flipAxisMode < 0.33) {
        flipXEnd = (1 + Math.floor(rand() * 3)) * 180;
      } else if (flipAxisMode < 0.66) {
        flipYEnd = (1 + Math.floor(rand() * 3)) * 180;
      } else {
        flipXEnd = (1 + Math.floor(rand() * 2)) * 180;
        flipYEnd = (1 + Math.floor(rand() * 2)) * 180;
      }
    }

    return {
      id: i,
      left: rand() * 100,
      size,
      duration: 9 + rand() * 12,
      delay: rand() * 18,
      driftX: -50 + rand() * 100,
      rotationStart,
      rotationEnd,
      flipXEnd,
      flipYEnd,
      opacity: 0.24 + rand() * 0.35,
      blur: rand() < 0.12 ? 0.5 + rand() * 0.9 : 0,
      variant: pickVariant(rand),
    };
  });
}

function useIsDesktop(breakpoint: number) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : true,
  );

  useEffect(() => {
    const getValue = () =>
      typeof window !== "undefined" ? window.innerWidth >= breakpoint : true;
    const onResize = () => setIsDesktop(getValue());

    setIsDesktop(getValue());
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isDesktop;
}

export default function FallingSquares({
  className = "",
  seed = 1337,
  mobileCount = 36,
  desktopCount = 78,
  breakpoint = 900,
  enableParallax = true,
  parallaxStrength = 18,
}: FallingSquaresProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useIsDesktop(breakpoint);
  const count = isDesktop ? desktopCount : mobileCount;

  const particles = useMemo(
    () => makeParticles(count, seed + count),
    [count, seed],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const updateSceneSize = () => {
      const doc = document.documentElement;
      const body = document.body;

      const pageWidth = Math.max(
        doc.scrollWidth,
        doc.clientWidth,
        body.scrollWidth,
        body.clientWidth,
      );

      const pageHeight = Math.max(
        doc.scrollHeight,
        doc.clientHeight,
        body.scrollHeight,
        body.clientHeight,
      );

      el.style.setProperty("--scene-width", `${pageWidth}px`);
      el.style.setProperty("--scene-height", `${pageHeight}px`);
      el.style.setProperty("--fall-distance", `${pageHeight + 180}px`);
    };

    updateSceneSize();

    const ro = new ResizeObserver(() => updateSceneSize());
    ro.observe(document.documentElement);
    ro.observe(document.body);

    window.addEventListener("resize", updateSceneSize);
    window.addEventListener("orientationchange", updateSceneSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSceneSize);
      window.removeEventListener("orientationchange", updateSceneSize);
    };
  }, []);

  useEffect(() => {
    if (!enableParallax) return;
    const el = rootRef.current;
    if (!el) return;

    let raf = 0;

    const handleMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--parallax-x", `${px * parallaxStrength}px`);
        el.style.setProperty("--parallax-y", `${py * parallaxStrength}px`);
      });
    };

    const reset = () => {
      el.style.setProperty("--parallax-x", "0px");
      el.style.setProperty("--parallax-y", "0px");
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", reset);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", reset);
    };
  }, [enableParallax, parallaxStrength]);

  return (
    <div
      ref={rootRef}
      className={`falling-squares ${className}`.trim()}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={`falling-squares__item falling-squares__item--${p.variant}`}
          style={
            {
              "--left": `${p.left}%`,
              "--size": `${p.size}px`,
              "--duration": `${p.duration}s`,
              "--delay": p.delay,
              "--drift-x": `${p.driftX}px`,
              "--rotation-start": `${p.rotationStart}deg`,
              "--rotation-end": `${p.rotationEnd}deg`,
              "--flip-x-end": `${p.flipXEnd}deg`,
              "--flip-y-end": `${p.flipYEnd}deg`,
              "--opacity": `${p.opacity}`,
              "--blur": `${p.blur}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}