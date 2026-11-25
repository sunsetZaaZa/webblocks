import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import Homepage from '../tablets/Homepage'
import MobileApps from '../tablets/Apps'
import Application from '../tablets/apps/Application'
import OuterfacingBusinessContact from '../tablets/OuterfacingBusinessContact'
import UserPrivacy from '../tablets/UserPrivacy'
import SoftwareLibraries from '../tablets/SoftwareLibraries'
import PackageName from '../tablets/software_libraries/Package_Name'
import { pageEnabled, siteContent } from '../content/site-content'
import type { PageKey } from '../../site/default-content.mjs'
import { routeAliases, routes } from './routes.mjs'

function LegacyRoute({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate replace to={{ pathname: to, search, hash }} />
}

function NotFound() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Page not found</h1>
      <p>The requested page does not exist.</p>
      <Link to={routes.home}>Return to homepage</Link>
    </main>
  )
}

// Stable template registry: route identity and editor roster IDs never depend
// on a repository's labels or which templates are enabled.
const templates = {
  home: Homepage, apps: MobileApps, application: Application,
  about: OuterfacingBusinessContact, privacy: UserPrivacy,
  libraries: SoftwareLibraries, softwarePackage: PackageName,
}

export default function AppRoutes() {
  const enabledPaths = new Set(siteContent.enabledPages.map(key => routes[key]))
  return (
    <Routes>
      {(Object.keys(templates) as PageKey[]).filter(pageEnabled).map(key => {
        const Template = templates[key]
        return <Route key={key} path={routes[key]} element={<Template />} />
      })}
      {Object.entries(routeAliases).filter(([, to]) => enabledPaths.has(to)).map(([from, to]) => (
        <Route key={from} path={from} element={<LegacyRoute to={to} />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
