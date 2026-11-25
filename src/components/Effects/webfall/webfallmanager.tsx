import { JSX, useCallback, useEffect, useRef, useState } from "react";
import WebFall, { RegisterItemFn, WebFallParticle, WebFallVariant } from "./webfall";
import { createPortal } from "react-dom";
import type { CssCustomProperties } from "../../../types/CssCustomProperties";

type ItemRecord = {
  particle: WebFallParticle;
  el: HTMLSpanElement;
  windOffset: number; // persistent horizontal offset in scene-percent units
};

type Gust = {
  from: number;
  to: number;
  peak: number;   // interpreted as scene-%/s
  dur: number;    // ms
  t0: number;     // ms
  attack: number; // 0..1
  decay: number;  // 0..1
};

export type WebFallWindManagerProps = {
  count?: number;
  fixed?: boolean;
  groups?: number;
  variants?: WebFallVariant[];
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothstep = (t: number) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};

function gustEnvelope(t01: number, attack = 0.2, decay = 0.3): number {
  const a = smoothstep(t01 / Math.max(attack, 1e-6));
  const d = 1 - smoothstep((t01 - (1 - decay)) / Math.max(decay, 1e-6));
  return clamp01(a * d);
}

function spatialWeight(x: number, from: number, to: number): number {
  const width = Math.max(1e-6, to - from);
  const center = from + width / 2;
  const half = width / 2;
  const w = 1 - Math.abs(x - center) / half;
  return clamp01(w);
}

function pickNonNeighborGroup(groups: number, last: number | null): number {
  if (groups <= 2 || last === null) return Math.floor(Math.random() * groups);

  const disallowed = new Set<number>([last, last - 1, last + 1]);

  for (let tries = 0; tries < 30; tries++) {
    const g = Math.floor(Math.random() * groups);
    if (!disallowed.has(g)) return g;
  }

  const candidates: number[] = [];
  for (let g = 0; g < groups; g++) {
    if (!disallowed.has(g)) candidates.push(g);
  }
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : last;
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/**
 * Approximate current drift contribution based on the CSS keyframes.
 * Uses scene-percent units, not viewport units.
 */
function driftFactor(kind: WebFallParticle["kind"], t01: number): number {
  t01 = clamp01(t01);

  if (kind === "snow") {
    if (t01 <= 0.5) return lerp(0, 0.6, t01 / 0.5);
    return lerp(0.6, 1, (t01 - 0.5) / 0.5);
  }

  const pts: Array<[number, number]> = [
    [0, 0],
    [0.25, 0.25],
    [0.5, 0.6],
    [0.75, 0.85],
    [1, 1],
  ];

  for (let i = 0; i < pts.length - 1; i++) {
    const [tA, vA] = pts[i];
    const [tB, vB] = pts[i + 1];
    if (t01 >= tA && t01 <= tB) {
      const u = (t01 - tA) / Math.max(1e-6, tB - tA);
      return lerp(vA, vB, u);
    }
  }

  return 1;
}

export default function WebFallWindManager({
  count = 80,
  fixed = false,
  groups = 9,
  variants,
}: WebFallWindManagerProps): JSX.Element {
  const itemsRef = useRef<Map<number, ItemRecord>>(new Map());
  const gustsRef = useRef<Gust[]>([]);
  const rafRef = useRef<number>(0);
  const lastGroupRef = useRef<number | null>(null);
  const lastNowRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [scene, setScene] = useState({ width: 0, height: 0 });

  const registerItem = useCallback<RegisterItemFn>((index, particle, el) => {
    if (el) {
      const existing = itemsRef.current.get(index);
      itemsRef.current.set(index, {
        particle,
        el,
        windOffset: existing?.windOffset ?? 0,
      });
    } else {
      itemsRef.current.delete(index);
    }
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

      const el = rootRef.current;
      if (el) {
        el.style.setProperty("--scene-width", `${width}px`);
        el.style.setProperty("--scene-height", `${height}px`);
        el.style.setProperty("--y0", `-120px`);
        el.style.setProperty("--y25", `${height * 0.25}px`);
        el.style.setProperty("--y50", `${height * 0.5}px`);
        el.style.setProperty("--y75", `${height * 0.75}px`);
        el.style.setProperty("--y1", `${height + 180}px`);
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
    const items = itemsRef.current;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    const groupWidth = 100 / groups;

    const spawnGust = () => {
      const g = pickNonNeighborGroup(groups, lastGroupRef.current);
      lastGroupRef.current = g;

      const pad = groupWidth * 0.12;
      const baseFrom = g * groupWidth;
      const baseTo = baseFrom + groupWidth;

      const from = baseFrom + Math.random() * pad;
      const to = baseTo - Math.random() * pad;

      const peak = (Math.random() * 10 - 5) * 0.9;
      const dur = 900 + Math.random() * 1600;

      gustsRef.current.push({
        from,
        to,
        peak,
        dur,
        t0: performance.now(),
        attack: lerp(0.12, 0.28, Math.random()),
        decay: lerp(0.18, 0.35, Math.random()),
      });
    };

    spawnGust();

    const intervalId = window.setInterval(() => {
      if (Math.random() < 0.85) spawnGust();
    }, 900);

    const tick = (now: number) => {
      const last = lastNowRef.current ?? now;
      lastNowRef.current = now;
      const dt = Math.min(48, Math.max(0, now - last));
      const dtSec = dt / 1000;

      gustsRef.current = gustsRef.current.filter((g) => now - g.t0 < g.dur);

      const sceneWidthPx =
        rootRef.current?.getBoundingClientRect().width ||
        scene.width ||
        window.innerWidth;

      for (const rec of items.values()) {
        const { particle, el } = rec;

        const tSec = now / 1000;
        const phase = mod(tSec + particle.delay, particle.dur);
        const t01 = particle.dur > 0 ? phase / particle.dur : 0;
        const df = driftFactor(particle.kind, t01);

        const xApprox = particle.x + rec.windOffset + particle.drift * df;

        let windV = 0;

        for (const g of gustsRef.current) {
          if (xApprox < g.from || xApprox > g.to) continue;

          const gt01 = clamp01((now - g.t0) / g.dur);
          windV +=
            g.peak *
            gustEnvelope(gt01, g.attack, g.decay) *
            spatialWeight(xApprox, g.from, g.to);
        }

        const turb = Math.sin(tSec * 2.1 + xApprox * 0.15) * 0.25;

        windV = clamp(windV, -8, 8);
        rec.windOffset = clamp(rec.windOffset + windV * dtSec, -35, 35);

        const windOffsetPx = (rec.windOffset / 100) * sceneWidthPx;
        const turbPx = (turb / 100) * sceneWidthPx;

        el.style.setProperty("--windOffset", `${windOffsetPx.toFixed(3)}px`);
        el.style.setProperty("--turb", `${turbPx.toFixed(3)}px`);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearInterval(intervalId);
      cancelAnimationFrame(rafRef.current);
      gustsRef.current = [];
      items.clear();
      lastGroupRef.current = null;
      lastNowRef.current = null;
    };
  }, [groups, scene.width]);

  const ui = (
    <div
      ref={rootRef}
      className="webfall-scene"
      style={
        {
          "--scene-width": `${scene.width || 0}px`,
          "--scene-height": `${scene.height || 0}px`,
        } as CssCustomProperties
      }
    >
      <WebFall
        count={count}
        fixed={fixed}
        variants={variants}
        registerItem={registerItem}
      />
    </div>
  );

  if (typeof document === "undefined") return ui;

  return createPortal(ui, document.body);
}