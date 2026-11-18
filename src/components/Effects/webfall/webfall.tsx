import { JSX, useMemo } from "react";
import type { CssCustomProperties } from "../../../types/CssCustomProperties";
import "./webfall.scss";

export type WebFallParticleKind = "snow" | "image";

export type WebFallVariantSnow = {
  kind: "snow";
  weight?: number;
  minSize?: number;
  maxSize?: number;
};

export type WebFallVariantImage = {
  kind: "image";
  weight?: number;
  srcs: string[];
  minSize?: number;
  maxSize?: number;
};

export type WebFallVariant = WebFallVariantSnow | WebFallVariantImage;

export type WebFallParticle = {
  id: string;
  kind: WebFallParticleKind;
  src?: string;

  size: number;
  opacity: number;
  dur: number;
  delay: number;
  blur: number;

  x: number;     // scene-percent style units, converted to px in CSS
  drift: number; // scene-percent style units, converted to px in CSS
};

export type RegisterItemFn = (
  index: number,
  particle: WebFallParticle,
  el: HTMLSpanElement | null
) => void;

export type WebFallProps = {
  count?: number;
  fixed?: boolean;
  className?: string;
  itemClassName?: string;
  variants?: WebFallVariant[];
  registerItem?: RegisterItemFn;
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickWeighted<T extends { weight?: number }>(items: T[]): T {
  const weights = items.map((v) => Math.max(0, v.weight ?? 1));
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const DEFAULT_VARIANTS: WebFallVariant[] = [
  { kind: "snow", weight: 1, minSize: 2, maxSize: 8 },
];

export default function WebFall({
  count = 80,
  fixed = false,
  className = "",
  itemClassName = "",
  variants = DEFAULT_VARIANTS,
  registerItem,
}: WebFallProps): JSX.Element {
  const particles = useMemo<WebFallParticle[]>(() => {
    const safeVariants = variants.length ? variants : DEFAULT_VARIANTS;

    return Array.from({ length: count }, (_, i) => {
      const v = pickWeighted(safeVariants);

      const minSize = v.minSize ?? (v.kind === "image" ? 14 : 2);
      const maxSize = v.maxSize ?? (v.kind === "image" ? 30 : 8);

      const size = randInt(minSize, maxSize);
      const opacity = v.kind === "image" ? rand(0.65, 0.95) : rand(0.3, 0.8);
      const dur = randInt(9, 20);
      const delay = -randInt(1, 12);
      const blur = v.kind === "image" ? 0 : randInt(0, 3);

      // Wider than scene so there is some horizontal bleed.
      const x = rand(-10, 110);
      const drift = rand(-8, 8);

      const src =
        v.kind === "image"
          ? v.srcs[Math.floor(Math.random() * v.srcs.length)]
          : undefined;

      return {
        id: `wf_${i}_${Math.random().toString(16).slice(2)}`,
        kind: v.kind,
        src,
        size,
        opacity,
        dur,
        delay,
        blur,
        x,
        drift,
      };
    });
  }, [count, variants]);

  return (
    <div
      className={["webfall", fixed ? "webfall--fixed" : "", className].join(" ")}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <span
          key={p.id}
          ref={(el) => registerItem?.(i, p, el)}
          className={[
            "webfall__item",
            p.kind === "snow" ? "webfall__item--snow" : "webfall__item--image",
            itemClassName,
          ].join(" ")}
          style={
            {
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
              backgroundImage: p.kind === "image" ? `url("${p.src}")` : undefined,

              "--x": `calc(var(--scene-width) * ${p.x / 100})`,
              "--drift": `calc(var(--scene-width) * ${p.drift / 100})`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--windOffset": `0px`,
              "--turb": `0px`,
            } as CssCustomProperties
          }
        />
      ))}
    </div>
  );
}