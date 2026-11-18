import type { CSSProperties } from "react";

export type CssCustomProperties = CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};
