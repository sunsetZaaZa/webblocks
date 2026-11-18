import { BrowserRouter, Route, Routes } from 'react-router'
import './App.css'

import Homepage from './tablets/Homepage'
import MobileApps from './tablets/Apps'
import Application from './tablets/apps/Application'
import OuterfacingBusinessContact from './tablets/OuterfacingBusinessContact'
import UserPrivacy from './tablets/UserPrivacy'
import SoftwareLibraries from './tablets/SoftwareLibraries'
import PackageName from './tablets/software_libraries/Package_Name'
import FallingSquares from './components/Effects/squares/fallingsquares'

function App() {

  return (
    <>
      <FallingSquares seed={20260306} mobileCount={28} desktopCount={74} enableParallax={true} parallaxStrength={14}/>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage/>} />
          <Route path="/apps" element={<MobileApps/>} />
          <Route path="/apps/application" element={<Application/>} />
          <Route path="/about" element={<OuterfacingBusinessContact/>} />
          <Route path="/user_privacy" element={<UserPrivacy/>} />
          <Route path="/software_libaries" element={<SoftwareLibraries/>} />
          <Route path="/software_libraries/package" element={<PackageName/>}></Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
