import './App.css'
import FallingSquares from './components/Effects/squares/fallingsquares'
import DeploymentRouter from './routing/DeploymentRouter'
import AppRoutes from './routing/AppRoutes'
import { siteConfig } from './config/site'

function App() {
  return (
    <>
      {siteConfig.features.effects && <FallingSquares seed={20260306} mobileCount={28} desktopCount={74} enableParallax={siteConfig.features.animations} className={siteConfig.features.animations ? undefined : "falling-squares--static"} parallaxStrength={14}/>}
      <DeploymentRouter>
        <AppRoutes />
      </DeploymentRouter>
    </>
  )
}

export default App
