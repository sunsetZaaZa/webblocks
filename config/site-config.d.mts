import type { DeploymentConfig, DeploymentProfile } from './deployment.mjs'
export interface SiteMetadata { title: string; description: string; language: string }
export interface RepositoryIdentity { owner: string; name: string }
export interface SiteFeatures { characters: boolean; effects: boolean; animations: boolean }
export interface SiteEditor { enabled: boolean; persistence: 'local' }
export interface SiteConfig {
  schemaVersion: 1; siteId: string; site: SiteMetadata; repository: RepositoryIdentity | null;
  deployment: { target: DeploymentProfile; basePath: string; routing: 'auto' | 'hash' | 'browser' };
  storybook: { publish: boolean };
  editor: SiteEditor; features: SiteFeatures;
}
export interface ResolvedSiteConfig extends Omit<SiteConfig, 'deployment'> {
  deployment: DeploymentConfig & { routing: 'hash' | 'browser' };
}
export function validateSiteConfig(input?: unknown): SiteConfig
export function loadSiteConfig(path: string | URL, options?: { optional?: boolean }): SiteConfig
export function resolveSiteConfig(config: unknown, mode: string, env?: Record<string, string | undefined>): ResolvedSiteConfig
export function renderSiteMetadata(html: string, site: SiteMetadata): string
