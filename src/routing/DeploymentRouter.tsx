import type { ReactNode } from 'react'
import { BrowserRouter, HashRouter } from 'react-router'
import { routingOptions } from './routes.mjs'

export default function DeploymentRouter({ children }: { children: ReactNode }) {
  const options = routingOptions(__WEBBLOCKS_DEPLOYMENT__, import.meta.env.BASE_URL)
  return options.kind === 'hash'
    ? <HashRouter>{children}</HashRouter>
    : <BrowserRouter basename={options.basename}>{children}</BrowserRouter>
}
