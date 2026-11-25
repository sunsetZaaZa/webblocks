export type DeploymentProfile = 'local' | 'github-pages' | 'docker'
export interface DeploymentConfig {
  profile: DeploymentProfile
  basePath: string
  source: 'explicit' | 'repository' | 'default'
}
export function normalizeBasePath(value: string): string
export function repositoryBasePath(repository?: string): string
export function resolveDeployment(mode: string, env?: Record<string, string | undefined>): DeploymentConfig
