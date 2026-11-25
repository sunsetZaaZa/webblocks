import { siteContent } from "../content/site-content";
import { siteConfig } from "../config/site";
import { assetUrl } from "../utilities/assetUrl";
import './scss/Homepage.scss'

import type { RootState } from '../state-management/store';
import { useDispatch, useSelector } from 'react-redux';

import NavGuide from "../components/NavGuide/NavGuide";
import { UIBranch } from '../state-management/models/UIBranch';

import { ControlPanelToggle } from '../components/ControlPanel/ControlPanelToggle/ControlPanelToggle';
import { ControlPanelControls } from '../components/ControlPanel/ControlPanelControls/ControlPanelControls';
import { SettingsControlPanel } from '../components/ControlPanel/SettingsControlPanel/SettingsControlPanel';

import { BuildCharacterElements } from '../components/Characters/CharacterUtil';
import { pauseAnimation, playAnimation, resetAnimation, settingsPanelArea, stopAnimation } from '../state-management/slices/AnimationSlice';
import { SettingsAreas } from '../state-management/slices/SliceStateSpecs';

export default function HomePage() {
    const animation = useSelector((state: RootState) => state.animation);
    const dispatch = useDispatch();
    const settingsArea = !siteConfig.features.characters && animation.settingsCurrentArea === SettingsAreas.chracterSheet ? SettingsAreas.menu : animation.settingsCurrentArea;
    const controllerOpen = siteConfig.features.animations && animation.openControllerPanel;

    const content = siteContent.pages.home;
    return (
        <span data-webblocks-page="home">
            {siteConfig.editor.enabled && <span className='editorPanel' style={{display: 'flex', flexDirection: 'row'}}>
                <span style={{display: 'flex', flexWrap: 'nowrap', flexDirection: 'row', position: 'absolute', gap: '2rem', zIndex: 11}}>
                    <span className='editorToggleBtn'>
                        <ControlPanelToggle showOpen={animation.openControlPanel}></ControlPanelToggle>
                    </span>
                    <span style={{display: animation.openControlPanel && animation.openSettingsPanel ? 'inline-block' : 'none', visibility: animation.openControlPanel && animation.openSettingsPanel ? 'visible' : 'hidden'}}>
                        <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap'}}>
                            <button style={{width: '50px', height: '40px', borderColor: settingsArea == SettingsAreas.menu ? 'purple': 'gray'}} onClick={() => { dispatch(settingsPanelArea(SettingsAreas.menu)); }}>Menu</button>
                            {siteConfig.features.characters && <button style={{width: '80px', height: '40px', borderColor: settingsArea == SettingsAreas.chracterSheet ? 'purple' : 'gray'}} onClick={() => { dispatch(settingsPanelArea(SettingsAreas.chracterSheet)); }}>Character Sheet</button>}
                            <button style={{width: '65px', height: '40px', borderColor: settingsArea == SettingsAreas.settings ? 'purple' : 'gray'}} onClick={() => { dispatch(settingsPanelArea(SettingsAreas.settings)); }}>Settings</button>
                        </span>
                    </span>
                    {siteConfig.features.animations && <span style={{display: animation.openControlPanel && controllerOpen ? 'inline-block' : 'none',  visibility: animation.openControlPanel && controllerOpen ? 'visible' : 'hidden'}}>
                        <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '4px', marginLeft: '20px'}}>
                            <button onClick={() => {dispatch(playAnimation())}}> <img style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/play.png")}/> </button>
                            <button onClick={() => {dispatch(pauseAnimation())}}> <img style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/pause.png")}/> </button>
                            <button onClick={() => {dispatch(resetAnimation())}}> <img style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/repeat.png")}/> </button>
                            <button onClick={() => {dispatch(stopAnimation())}}> <img style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/stop.png")}/> </button>
                        </span>
                    </span>}

                    <ControlPanelControls showSelf={animation.openControlPanel} showAnimControllerPanel={controllerOpen} showAminSettingsPanel={animation.openSettingsPanel}></ControlPanelControls>

                </span>
                <span className='characterEditor' style={{display: 'flex', position: 'absolute', zIndex: 11, marginTop: 50}}>
                    <SettingsControlPanel showAimSettingsPanel={animation.openControlPanel && animation.openSettingsPanel && controllerOpen == false}></SettingsControlPanel>
                </span>
            </span>}

            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.homepage)}
            </span>

            <span className="bodyMassMover">
                {content.heading}
            </span>

            <span style={{display: 'block', margin: '80px 0px 0px 170px', cursor: 'default'}}>
                <span style={{display: 'flex', flexDirection: 'column', margin: '40px 0px 0px 15px'}}>

                    <span className="hero-copy">
                        {content.hero}
                    </span>

                    <span style={{display: 'flex', flexDirection: 'column', marginTop: '25px', gap: '25px'}}>
                        <span style={{display: 'flex', flexDirection: 'column'}}>
                            <span style={{display: 'inline-block'}}>{content.tagline}</span>
                        </span>
                    </span>
                </span>
            </span>
        </span>
    )
}