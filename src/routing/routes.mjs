/** Application paths never include a hosting prefix or hash-router marker. */
export const routes = Object.freeze({
  home: '/',
  apps: '/apps',
  application: '/apps/application',
  about: '/about',
  privacy: '/user_privacy',
  libraries: '/software_libraries',
  softwarePackage: '/software_libraries/package',
})

/** Previously shipped link targets; replace history entries on redirect. */
export const routeAliases = Object.freeze({
  '/apps/app': routes.application,
  '/userprivacy': routes.privacy,
  '/software_libaries': routes.libraries,
})

/** HashRouter uses the fragment for routes, not the document base path. */
export function routingOptions(profile, basePath) {
  if (profile === 'github-pages') return { kind: 'hash' }
  if (profile === 'local' || profile === 'docker') {
    return { kind: 'browser', basename: basePath }
  }
  throw new Error(`Unsupported Webblocks deployment profile: ${profile}`)
}
