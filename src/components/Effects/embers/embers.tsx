import { useMemo } from "react";
import type { CssCustomProperties } from "../../../types/CssCustomProperties";
import "./embers.scss";

type EmberSpec = {
  i: number;
  group: number;
  xPct: number;
  fallDurationS: number;
  delayS: number;
  sizePx: number;
  swayDurationS: number;
  swayDistancePx: number;
  glow: number;
  flickerDurationS: number;
  smokeLengthPx: number;
  smokeDurationS: number;
  smokeAlpha: number;
  hue: number;
  alpha: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type EmbersProps = {
  count?: number;
  groups?: number;
  className?: string;
  seed?: number;
};

export function Embers({ count = 140, groups = 12, className, seed = 1337 }: EmbersProps) {
  const embers = useMemo(() => {
    const rand = mulberry32(seed);
    const specs: EmberSpec[] = [];

    for (let i = 0; i < count; i++) {
      const group = Math.min(groups - 1, Math.floor((i / Math.max(1, count)) * groups));

      const xRaw = rand();
      const xPct = Math.max(-25, Math.min(125, xRaw * 150 - 25 + (rand() - 0.5) * 8));

      const fallDurationS = 7 + rand() * 10;
      const delayS = -rand() * fallDurationS;

      const sizePx = 1.8 + rand() * 4.8;
      const swayDurationS = 1.8 + rand() * 3.8;
      const swayDistancePx = 4 + rand() * 14;

      const glow = 0.35 + rand() * 0.65;
      const flickerDurationS = 0.6 + rand() * 1.4;

      const smokeLengthPx = 18 + rand() * 60;
      const smokeDurationS = 1.4 + rand() * 2.3;
      const smokeAlpha = 0.10 + rand() * 0.22;

      const hue = 18 + rand() * 18;
      const alpha = 0.45 + rand() * 0.55;

      specs.push({
        i,
        group,
        xPct,
        fallDurationS,
        delayS,
        sizePx,
        swayDurationS,
        swayDistancePx,
        glow,
        flickerDurationS,
        smokeLengthPx,
        smokeDurationS,
        smokeAlpha,
        hue,
        alpha,
      });
    }

    return specs;
  }, [count, groups, seed]);

  return (
    <div className={["webfall-embers", className].filter(Boolean).join(" ")} aria-hidden="true">
      {embers.map((e) => {
        const style: CssCustomProperties = {
          "--x": `${e.xPct}%`,
          "--fall-duration": `${e.fallDurationS}s`,
          "--delay": `${e.delayS}s`,
          "--size": `${e.sizePx}px`,
          "--sway-duration": `${e.swayDurationS}s`,
          "--sway-distance": `${e.swayDistancePx}px`,
          "--glow": `${e.glow}`,
          "--flicker-duration": `${e.flickerDurationS}s`,
          "--smoke-length": `${e.smokeLengthPx}px`,
          "--smoke-duration": `${e.smokeDurationS}s`,
          "--smoke-alpha": `${e.smokeAlpha}`,
          "--hue": `${e.hue}`,
          "--alpha": `${e.alpha}`,
          "--wind-offset-x": `0px`,
          "--wind-offset-y": `0px`,
        };

        return (
          <span key={e.i} className="webfall-embers__pY" data-webfall-group={e.group} style={style}>
            <span className="webfall-embers__pX">
              <span className="webfall-embers__ember" />
            </span>
          </span>
        );
      })}
    </div>
  );
}