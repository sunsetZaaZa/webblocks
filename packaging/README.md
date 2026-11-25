# @webblocks/webblocks (source-first preview)

A versioned GPL-3.0-or-later distribution of Webblocks. The package name is proposed; this tarball has not been published to npm.

## Component consumer (Vite 7, React 19)

Install this exact tarball with `bun add --exact ./webblocks-webblocks-0.1.6.tgz`. Supply the declared React, React DOM, Vite and Sass peers and the usual React Vite plugin and TypeScript types. Import components from `@webblocks/webblocks/components`; the implementation is typed TSX and the stylesheet imports are compiled by the consumer. The public declarations re-export source types. This is not a precompiled JS component library or a Node/SSR entry point. In Vite development exclude `@webblocks/webblocks/components` from `optimizeDeps` so Vite transforms its TSX, SCSS and `import.meta.env.BASE_URL` using the consumer's deployment configuration. Use TypeScript bundler resolution, `jsx: react-jsx` and Vite client types; strict-mode compatibility has not been qualified.

```tsx
import { SemanticButton, FallingSquares, WebFall, Embers } from '@webblocks/webblocks/components'
import { resolvePublicAsset } from '@webblocks/webblocks/assets'
```

Pure asset helpers also work in Node ESM via the package root. To use a bundled PNG, import `@webblocks/webblocks/public/duck.png` using Vite's URL handling. For WebFall local paths, copy assets into the consumer's public directory and use unprefixed paths; alternatively supply an absolute HTTP(S) URL (for an imported Vite asset, resolve its URL with `new URL(importedUrl, window.location.origin).href` before passing it to WebFall). Component CSS is included through the source imports; global Webblocks site styles and fonts are available in the complete starter, not automatically applied to component consumers.

## Full website

Run `bun --bun run webblocks-create --destination ../website --owner OWNER --repo REPO --title "Project website"` after installing the tarball in a tooling directory. The command creates a complete, version-pinned source snapshot, including the Bun lockfile, workflows, artwork, styles, fonts and tests. It refuses existing file collisions. Use the generated website's own `bun install --frozen-lockfile` and documented Pages build commands. The full editor and application are not yet an embeddable component API.

## Upgrades

For component consumers, explicitly install a newer reviewed tarball and commit the lockfile. For full sites, generate the new snapshot into a separate directory and review/merge framework changes; do not overwrite site-owned content, config, defaults or project assets. No automatic migration or registry publication is performed.

See LICENSE and the starter source and artwork inventory for licensing and provenance. Original missing artwork is represented by documented placeholders. See public/legal/ for font licenses and the artwork inventory. ST-SimpleSquare has been removed from this version. Review project-owned media and third-party dependency notices before public redistribution. This preview is not a security certification.
