import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CssCustomProperties } from "../../../types/CssCustomProperties";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randBetween(r: () => number, min: number, max: number) {
  return min + (max - min) * r();
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function pickNonAdjacentGroup(r: () => number, groups: number, last: number | null) {
  if (groups <= 1) return 0;
  if (last == null) return Math.floor(r() * groups);

  const banned = new Set<number>([
    last,
    clamp(last - 1, 0, groups - 1),
    clamp(last + 1, 0, groups - 1),
  ]);

  if (groups < 4) {
    let g = Math.floor(r() * groups);
    for (let tries = 0; tries < 10 && g === last; tries++) g = Math.floor(r() * groups);
    return g;
  }

  let g = Math.floor(r() * groups);
  for (let tries = 0; tries < 24 && banned.has(g); tries++) g = Math.floor(r() * groups);

  if (banned.has(g)) {
    const candidates = Array.from({ length: groups }, (_, i) => i).filter((i) => !banned.has(i));
    return candidates.length ? candidates[Math.floor(r() * candidates.length)] : (last + 2) % groups;
  }

  return g;
}

export type EmberManagerProps = {
  children?: React.ReactNode;
  groups?: number;
  enabled?: boolean;
  gustEveryMs?: [number, number];
  affectRatio?: [number, number];
  windDistancePx?: [number, number];
  windDurationS?: [number, number];
  fastChance?: number;
  fastDurationS?: [number, number];
  upAngleDegRange?: [number, number];
  className?: string;
};

export function EmberManager({
  children,
  groups = 12,
  enabled = true,
  gustEveryMs = [900, 2200],
  affectRatio = [0.45, 0.85],
  windDistancePx = [28, 90],
  windDurationS = [1.1, 2.1],
  fastChance = 0.22,
  fastDurationS = [0.35, 0.75],
  upAngleDegRange = [-155, -25],
  className,
}: EmberManagerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastGroupRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const [scene, setScene] = useState({ width: 0, height: 0 });

  const rng = useMemo(() => {
    let s = (Date.now() ^ 0x9e3779b9) >>> 0;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 10_000) / 10_000;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateScene = () => {
      const doc = document.documentElement;
      const body = document.body;

      const width = Math.max(
        doc.scrollWidth,
        doc.clientWidth,
        body.scrollWidth,
        body.clientWidth,
      );

      const height = Math.max(
        doc.scrollHeight,
        doc.clientHeight,
        body.scrollHeight,
        body.clientHeight,
      );

      setScene({ width, height });

      const root = rootRef.current;
      if (root) {
        root.style.setProperty("--scene-width", `${width}px`);
        root.style.setProperty("--scene-height", `${height}px`);
        root.style.setProperty("--y0", `-120px`);
        root.style.setProperty("--y1", `${height + 180}px`);
      }
    };

    updateScene();

    const ro = new ResizeObserver(() => updateScene());
    ro.observe(document.documentElement);
    ro.observe(document.body);

    window.addEventListener("resize", updateScene);
    window.addEventListener("orientationchange", updateScene);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScene);
      window.removeEventListener("orientationchange", updateScene);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    const scheduleNext = () => {
      const ms = Math.floor(randBetween(rng, gustEveryMs[0], gustEveryMs[1]));
      timerRef.current = window.setTimeout(runGust, ms);
    };

    const runGust = () => {
      const root = rootRef.current;
      if (!root) return scheduleNext();

      const group = pickNonAdjacentGroup(rng, groups, lastGroupRef.current);
      lastGroupRef.current = group;

      const candidates = Array.from(
        root.querySelectorAll<HTMLElement>(`[data-webfall-group="${group}"] .webfall-embers__pX`)
      );

      if (!candidates.length) return scheduleNext();

      const ratio = randBetween(rng, affectRatio[0], affectRatio[1]);
      const toAffect = Math.max(1, Math.floor(candidates.length * ratio));

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      const picked = candidates.slice(0, toAffect);

      const isFast = rng() < fastChance;
      const dist = randBetween(rng, windDistancePx[0], windDistancePx[1]);
      const dur = isFast
        ? randBetween(rng, fastDurationS[0], fastDurationS[1])
        : randBetween(rng, windDurationS[0], windDurationS[1]);

      const [minDeg, maxDeg] = upAngleDegRange;
      const theta = degToRad(randBetween(rng, minDeg, maxDeg));
      const dxBase = Math.cos(theta) * dist;
      const dyBase = Math.sin(theta) * dist;

      picked.forEach((el) => {
        const curX = Number(el.dataset.windX ?? "0");
        const curY = Number(el.dataset.windY ?? "0");

        const jitter = 0.65 + rng() * 0.7;
        const dx = dxBase * jitter;
        const dy = dyBase * jitter;

        const nextX = curX + dx;
        const nextY = curY + dy;

        el.style.setProperty("--wind-from-x", `${curX}px`);
        el.style.setProperty("--wind-from-y", `${curY}px`);
        el.style.setProperty("--wind-to-x", `${nextX}px`);
        el.style.setProperty("--wind-to-y", `${nextY}px`);
        el.style.setProperty("--wind-duration", `${dur}s`);

        el.classList.remove("webfall-embers__pX--gust");
        el.getBoundingClientRect();
        el.classList.add("webfall-embers__pX--gust");

        const onEnd = () => {
          el.style.setProperty("--wind-offset-x", `${nextX}px`);
          el.style.setProperty("--wind-offset-y", `${nextY}px`);
          el.dataset.windX = String(nextX);
          el.dataset.windY = String(nextY);

          el.classList.remove("webfall-embers__pX--gust");
          el.style.removeProperty("--wind-from-x");
          el.style.removeProperty("--wind-from-y");
          el.style.removeProperty("--wind-to-x");
          el.style.removeProperty("--wind-to-y");

          el.removeEventListener("animationend", onEnd);
        };

        el.addEventListener("animationend", onEnd);
      });

      scheduleNext();
    };

    scheduleNext();

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [
    enabled,
    groups,
    gustEveryMs,
    affectRatio,
    windDistancePx,
    windDurationS,
    fastChance,
    fastDurationS,
    upAngleDegRange,
    rng,
  ]);

  const node = (
    <div
      ref={rootRef}
      className={["webfall-embers-root", className].filter(Boolean).join(" ")}
      style={
        {
          "--scene-width": `${scene.width || 0}px`,
          "--scene-height": `${scene.height || 0}px`,
        } as CssCustomProperties
      }
    >
      {children}
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(node, document.body);
  }

  return node;
}