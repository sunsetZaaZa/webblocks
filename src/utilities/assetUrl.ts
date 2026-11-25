import { mediaBackgroundImage, resolvePublicAsset } from './asset-path.mjs'

/** Public directory path, relative to the site rather than the domain root. */
export function assetUrl(path: string): string {
  return resolvePublicAsset(path, import.meta.env.BASE_URL)
}

/** Resolve a runtime image source and safely quote it for a CSS URL. */
export function assetBackgroundImage(path: string | undefined): string | undefined {
  return mediaBackgroundImage(path, import.meta.env.BASE_URL)
}
