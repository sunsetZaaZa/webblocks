import './SettingsControlPanel.scss'

import { useRef } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { persistor, RootState } from '../../../state-management/store';

import { nanoid } from 'nanoid';

import { updateCharSheetCurrentX, updateCharSheetCurrentY, setJuggleAnimationBoundingBoxes, setIsNonStop, setRunLength, setShowFPS, setTargetFPS, togglePersist, updateCharSheetActive, updateCharSheetToRender, updateCharSheetRotation, updateCharSheetTimeDelay, updateCharSheetType, updateCharSheetSubType, updateCharSheetAttribute, updateCharSheetOrientation, updateCharSheetHeight, updateCharSheetWidth, updateCharSheetZIndex, resetCharacterSheet } from '../../../state-management/slices/AnimationSlice';
import { BuildCharacterTypeOptions, BuildCharacterSubTypeOptions, BuildCharacterAttributeOptions, BuildCharacterOrientationOptions } from './SettingsControlPanelUtilities';
import { AnimationStatsPanel } from './AnimationStatsPanel/AnimationStatsPanel';
import { TemplateSpawner } from '../Subcomponents/TemplateSpawner';
import { selectableCharacters } from '../Subcomponents/TemplateSpawnerPresets';
import { CharacterSheetControls } from './CharacterSheetControls';
import { CharacterRoster } from './CharacterRoster/CharacterRoster';
import { SpeakingDialog } from './SpeakingDialog/SpeakingDialog';
import { InputTooltip } from '../../Modifiers/InputTooltip/InputTooltip';
import { CharacterViewer } from '../../CharacterViewer/CharacterViewer';
import { SettingsAreas } from '../../../state-management/slices/SliceStateSpecs';
import { MiscCharacterSettings } from './MiscCharacterSettings/MiscCharacterSettings';
import { HotkeyCarousel } from '../../HotkeyCarousel/HotkeyCarousel';
import { hotkeyBtns } from '../../UISectionHotkeys/HotkeyUtil';

export type SettingsControlPanelProps = {
    showAimSettingsPanel: boolean;
}

export const SettingsControlPanel = (props: SettingsControlPanelProps) => {
    const dispatch = useDispatch();
    const animation = useSelector((state: RootState) => state.animation);
    const charSheetFields = animation.charSheetFields;
    const keyId = useRef(nanoid());

    const displayOption: string = props.showAimSettingsPanel ? 'flex' : 'none';
    const menuDisplay: string = animation.settingsCurrentArea == SettingsAreas.menu ? 'flex' : 'none';
    const characterSheetDisplay: string = animation.settingsCurrentArea == SettingsAreas.chracterSheet ? 'flex' : 'none';
    const settingsDisplay: string = animation.settingsCurrentArea == SettingsAreas.settings ? 'flex' : 'none';

    return (
        <span key={keyId.current} className='settingsControlPanel' style={{display: displayOption}}> 
            <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', width: '28rem',}}>

                <span style={{display: menuDisplay, flexDirection: 'column', flexWrap: 'nowrap', width: '19rem', height: 'auto', gap: '12px', backgroundColor: 'gray', borderRadius: '7px', paddingTop: '1rem', paddingBottom: '1rem'}}>
                    <InputTooltip styling={{marginLeft: 'auto', marginRight: 'auto', marginBottom: '7px'}} toolTipSytling={{marginTop: '-3px', marginLeft: '-20px'}} toolTip={'The Editor UI and Characters will remain placed throughout visits'}>
                        <span style={{display: 'flex', flexDirection: 'row', gap: '7px'}}>
                            <span>Presist Characters</span>
                            <input type='checkbox' checked={animation.menuFields.presistCharacters} onChange={(event) => { if (event.target.checked) { persistor.persist(); } else { persistor.purge(); } persistor.pause(); dispatch(togglePersist(event.target.checked))}}></input>
                        </span>
                    </InputTooltip>
                    <InputTooltip styling={{marginLeft: 'auto', marginRight: 'auto', marginBottom: '7px'}} toolTipSytling={{marginTop: '-3px', marginLeft: '-20px'}} toolTip={'Refresh the website afterward'}>
                        <span style={{display: 'flex', flexDirection: 'row', gap: '7px', marginLeft: 'auto', marginRight: 'auto',}}>
                            <input type='button' className="" value='Clear Character Sheet' onClick={() => { persistor.purge(); }}></input>
                        </span>
                    </InputTooltip>
                    <span style={{display: 'flex', flexDirection: 'row', gap: '7px', marginLeft: 'auto', marginRight: 'auto'}}>
                        <input type='button' className=""  value='Reset Character Sheet' onClick={() => {dispatch(resetCharacterSheet()); }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', gap: '7px', marginLeft: 'auto', marginRight: 'auto'}}>
                        <span>Target Frames per Second</span>
                        <input type='number' disabled={true} min={0} max={600} value={animation.menuFields.targetFPS} onChange={(event) => {dispatch(setTargetFPS(parseInt(event.target.value)))}}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', gap: '7px', marginLeft: 'auto', marginRight: 'auto'}}>
                        <span>Show Frames per Second</span>
                        <input type='checkbox' disabled={true} checked={animation.menuFields.showFPS} onChange={(event) => {dispatch(setShowFPS(event.target.checked))}}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', gap: '7px', marginLeft: 'auto', marginRight: 'auto'}}>
                        <span>Total run time</span>
                        <input type='number' disabled={true} min={0} max={600} value={animation.menuFields.runLength} onChange={(event) => {dispatch(setRunLength(parseInt(event.target.value)))}}></input>
                    </span>
                        <InputTooltip styling={{marginLeft: 'auto', marginRight: 'auto'}} toolTipSytling={{marginTop: '-5px', marginLeft: '-20px'}} toolTip={'Animations will play until told to stop via a pause or stop command'}> 
                            <span style={{display: 'flex', flexDirection: 'row', gap: '7px'}}>
                                <span>Nonstop Loop</span>
                                <input type='checkbox' disabled={true} checked={animation.menuFields.nonStop} onChange={(event) => {dispatch(setIsNonStop(event.target.checked))}}></input>
                            </span>
                        </InputTooltip>
                </span>

                <span style={{display: characterSheetDisplay, flexDirection: 'row', flexWrap: 'nowrap', minWidth: '28rem', height: '22rem', backgroundColor: 'gray', borderRadius: '7px', gap: '12px'}}>
                    <span style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        <span style={{display: 'flex', flexDirection: 'column'}}>
                            <span style={{display: 'inline-block', marginLeft: 'auto', marginRight: 'auto', marginTop: '5px'}}>Templates</span>
                            <span className='scp_scrollbar' style={{width:'8rem'}}>
                                <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', gap: '20px', height: '12rem', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '10px'}}> 
                                    {TemplateSpawner(selectableCharacters)}
                                </span>
                            </span>
                        </span>

                        <span style={{fontFamily: 'ShareTech', textDecoration: 'none', color: 'inherit', marginLeft: '4px', display: charSheetFields.character.credits !== undefined ? 'inline': 'none', fontSize: charSheetFields.character.credits != undefined ? charSheetFields.character.credits.length <= 7 ? '18px' : '13px' : '0px', cursor: 'none' }}>{charSheetFields.character.credits}</span>
                        <div style={{display: 'flex', flexDirection: 'column', marginTop: charSheetFields.character.credits == undefined ? '20px' : '0px', marginLeft: '20px'}}>
                            <CharacterViewer info={charSheetFields.character}></CharacterViewer>
                        </div>
                    </span>

                    <span style={{display: 'flex', flexDirection: 'column', width: 'auto'}}>
                        <span style={{display: 'inline-block', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(44, 44, 35, 0.782) rgba(255, 255, 255, 0)', scrollBehavior: 'smooth', paddingRight: '10px'}}>
                            <span style={{display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '5px', paddingRight: '5px', paddingBottom: '20px'}}>
                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between'}}>
                                    <span style={{display: 'flex', flexDirection: 'column', marginLeft: '5px'}}>
                                        <span style={{display: 'inline-block'}}>Character Type</span>
                                        <select style={{height: '28px'}} value={charSheetFields.character.type} onChange={(event) => {dispatch(updateCharSheetType(parseInt(event.target.value)))}}>
                                            {BuildCharacterTypeOptions()}
                                        </select>
                                    </span>

                                    <span style={{display: 'flex', flexDirection: 'column', marginRight: '5px'}}>
                                        <span style={{display: 'inline-block'}}>Sub Type</span>
                                        <select style={{height: '28px'}} value={charSheetFields.character.subType} onChange={(event) => {dispatch(updateCharSheetSubType(parseInt(event.target.value)))}}>
                                            {BuildCharacterSubTypeOptions()}
                                        </select>
                                    </span>
                                </span>

                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between'}}>
                                    <span style={{display: 'flex', flexDirection: 'column', marginLeft: '1rem'}}>
                                        <span style={{display: 'inline-block'}}>Attribute</span>
                                        <select style={{height: '28px', width: 'auto'}} value={charSheetFields.character.attributes[0]} onChange={(event) => {dispatch(updateCharSheetAttribute(parseInt(event.target.value)))}}>
                                            {BuildCharacterAttributeOptions()}
                                        </select>
                                    </span>

                                    <span style={{display: 'flex', flexDirection: 'column', marginRight: '1rem'}}>
                                        <span style={{display: 'inline-block'}}>Orientation</span>
                                        <select style={{height: '28px', width: 'auto'}} value={charSheetFields.character.orientation} onChange={(event) => {dispatch(updateCharSheetOrientation(parseInt(event.target.value)))}}>
                                            {BuildCharacterOrientationOptions()}
                                        </select>
                                    </span>
                                </span>

                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '27px'}}>
                                    <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
                                        <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '10px'}}>
                                            <span style={{display: 'inline-block'}}>X:</span>
                                            <input type='number' style={{height: '20px', width: '60px'}} min={1} value={charSheetFields.character.currentX != undefined ? !isNaN(charSheetFields.character.currentX) && isFinite(charSheetFields.character.currentX) ? charSheetFields.character.currentX : '' : 1} 
                                                onChange={(event) => {let value = parseInt(event.target.value); if(value <= 0) value = 1; if(value > charSheetFields.xCordThreshold) {value = charSheetFields.xCordThreshold} dispatch(updateCharSheetCurrentX(value)) }}></input>
                                        </span>
                                        <span style={{fontSize: '15px'}}>X Threshold {charSheetFields.xCordThreshold}</span>
                                    </span>
                                    <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
                                        <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '10px'}}>
                                            <span style={{display: 'inline-block'}}>Y:</span>
                                            <input type='number' style={{height: '20px', width: '60px'}} min={1} value={charSheetFields.character.currentY != undefined ? !isNaN(charSheetFields.character.currentY) && isFinite(charSheetFields.character.currentY) ? charSheetFields.character.currentY : '' : 1} 
                                                onChange={(event) => {let value = parseInt(event.target.value); if(value <= 0) value = 1; if(value > charSheetFields.yCordThreshold) {value = charSheetFields.yCordThreshold} dispatch(updateCharSheetCurrentY(value)) }}></input>
                                        </span>
                                        <span style={{fontSize: '15px'}}>Y Threshold {charSheetFields.yCordThreshold}</span>
                                    </span>
                                </span>
                                <AnimationStatsPanel character={charSheetFields.character}></AnimationStatsPanel>
                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '17px'}}>
                                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '3px'}}>
                                        <span>Active</span>
                                        <input type='checkbox' disabled={true} checked={charSheetFields.character.active ?? false} onChange={(event) => {dispatch(updateCharSheetActive(event.target.checked))}}></input>
                                    </span>
                                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '3px'}}>
                                        <span>To Render</span>
                                        <input type='checkbox' disabled={true} checked={charSheetFields.character.toRender ?? false} onChange={(event) => {dispatch(updateCharSheetToRender(event.target.checked))}}></input>
                                    </span>
                                </span>
                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '17px'}}>
                                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                                        <span>Rotation</span>
                                        <input type='number' min={-360} max={360} value={charSheetFields.character.rotation != undefined ? !isNaN(charSheetFields.character.rotation) && isFinite(charSheetFields.character.rotation) ? charSheetFields.character.rotation : '' : ''} onChange={(event) => {const value = parseInt(event.target.value);  dispatch(updateCharSheetRotation(value)) }}></input>
                                    </span>
                                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                                        <span>Delay</span>
                                        <input type='number' readOnly={true} min={0} max={360} value={charSheetFields.character.delay != undefined ? !isNaN(charSheetFields.character.delay) && isFinite(charSheetFields.character.delay) ? charSheetFields.character.delay : '' : ''} onChange={(event) => {const value = parseInt(event.target.value); dispatch(updateCharSheetTimeDelay(value)) }}></input>
                                    </span>
                                </span>
                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '17px'}}>
                                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                                        <span>Height</span>
                                        <input type='number' min={0} max={500} value={charSheetFields.character.sizes?.height != undefined ? !isNaN(charSheetFields.character.sizes?.height) && isFinite(charSheetFields.character.sizes?.height) ? charSheetFields.character.sizes?.height : '' : ''} onChange={(event) => {const value = parseInt(event.target.value); dispatch(updateCharSheetHeight(value)) }}></input>
                                    </span>
                                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                                        <span>Width</span>
                                        <input type='number' min={0} max={500} value={charSheetFields.character.sizes?.width != undefined ? !isNaN(charSheetFields.character.sizes?.width) && isFinite(charSheetFields.character.sizes?.width) ? charSheetFields.character.sizes?.width : '' : ''} onChange={(event) => {const value = parseInt(event.target.value); dispatch(updateCharSheetWidth(value)) }}></input>
                                    </span>
                                </span>
                                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                                    <span>Visual Layer</span>
                                    <input type='number' style={{width: '75px'}} value={charSheetFields.character?.zIndex != undefined ? !isNaN(charSheetFields.character?.zIndex) && isFinite(charSheetFields.character?.zIndex) ? charSheetFields.character?.zIndex : '' : ''} onChange={(event) => {const value = parseInt(event.target.value); dispatch(updateCharSheetZIndex(value)) }}></input>
                                </span>
                                <SpeakingDialog character={charSheetFields.character}></SpeakingDialog>
                                <MiscCharacterSettings character={charSheetFields.character}></MiscCharacterSettings>
                            </span>
                        </span>
                        <CharacterSheetControls selectedUIBranch={animation.rosterPage}></CharacterSheetControls>
                    </span>
                </span>

                <span style={{display: settingsDisplay, flexDirection: 'column', flexWrap: 'nowrap',  width: '22rem', height: '8rem', paddingTop: '10px', backgroundColor: 'gray', borderRadius: '7px'}}>
                    <InputTooltip  toolTipSytling={{marginTop: '-5px', marginLeft: '-20px'}} toolTip={'Animation Bounding Boxes are swapped between characters during playback'}>
                        <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginLeft: '10px'}}>
                            <span>Juggle Animation Bounding Shapes</span>
                            <input type='checkbox' disabled={true} checked={animation.settingsFields.juggleAnimationBounding ?? false} onChange={(event) => {dispatch(setJuggleAnimationBoundingBoxes(event.target.checked))}}></input>
                        </span>
                    </InputTooltip>
                </span>
            </span>

            <span className='characterRosterPanel' style={{display: 'flex', flexDirection: 'column', marginLeft: 'auto', marginRight: 'auto'}}>
                <span style={{visibility: animation.openControlPanel && animation.openSettingsPanel && animation.settingsCurrentArea == SettingsAreas.chracterSheet ? 'visible' : 'hidden'}}>
                    <span style={{display: 'block', marginBottom: '1.5rem'}}>
                        <HotkeyCarousel {...hotkeyBtns}></HotkeyCarousel>
                    </span>
                </span>
                <span style={{marginLeft: 'auto', marginRight: 'auto'}}>
                    <CharacterRoster shouldDisplay={characterSheetDisplay}></CharacterRoster>
                </span>
            </span>

        </span>
    );
}