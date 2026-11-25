export const routes: Readonly<{
  home: '/'; apps: '/apps'; application: '/apps/application'; about: '/about';
  privacy: '/user_privacy'; libraries: '/software_libraries'; softwarePackage: '/software_libraries/package';
}>
export const routeAliases: Readonly<Record<string, typeof routes[keyof typeof routes]>>
export function routingOptions(profile: 'local' | 'github-pages' | 'docker', basePath: string):
  { kind: 'hash' } | { kind: 'browser'; basename: string }
