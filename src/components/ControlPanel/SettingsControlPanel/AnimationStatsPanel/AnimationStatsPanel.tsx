import { useId, useState } from 'react';
import { useDispatch } from "react-redux";

import { BuildAnimationBoundingShapeText, BuildAnimationStatsDirectionText } from './AnimationStatsUtil';
import { AnimationBoundingShapeText, MovementDirectionText } from '../../../../state-management/models/AnimationStats';
import { upateCharSheetMovementTwo, upateCharSheetMovementOne, updateCharSheetMovementXInterval, updateCharSheetMovementYInterval, updateCharSheetMovementXRate, updateCharSheetMovementYRate, updateCharSheetXBound, updateCharSheetYBound, updateCharSheetXOrigin, updateCharSheetYOrigin, updateCharSheetBoundingBox } from '../../../../state-management/slices/AnimationSlice';
import { CharacterStats } from '../../../../state-management/models/CharacterStats';
import { CollapsibleSettingsHeader } from '../CollapsibleSettingsHeader/CollapsibleSettingsHeader';

export type AnimationStatsPanelPropSpec = {
    character?: CharacterStats,
}

export const AnimationStatsPanel = (prop: AnimationStatsPanelPropSpec) => {
    const dispatch = useDispatch();
    const [carrotUpward, setCarrotUpward] = useState<boolean>(false);
    const movementSettingsPanelId = useId();

    return(
        <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
            <CollapsibleSettingsHeader
                controlsId={movementSettingsPanelId}
                expanded={carrotUpward}
                onToggle={() => {setCarrotUpward(!carrotUpward)}}
                title="Movement Settings"
            />
            <span id={movementSettingsPanelId} hidden={!carrotUpward} style={{display: carrotUpward ? 'flex': 'none', flexDirection: 'column', flexWrap: 'nowrap'}}>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>X Interval</span>
                        <input type='number' disabled={true} min={0} max={100} value={prop.character?.movement?.xInterval != undefined ? !isNaN(prop.character?.movement?.xInterval) && isFinite(prop.character?.movement?.xInterval) ? prop.character?.movement?.xInterval : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetMovementXInterval(value)) }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Y Interval</span>
                        <input type='number'disabled={true}  min={0} max={100} value={prop.character?.movement?.yInterval != undefined ? !isNaN(prop.character?.movement?.yInterval) && isFinite(prop.character?.movement?.yInterval) ? prop.character?.movement?.yInterval : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetMovementYInterval(value)) }}></input>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', marginTop: '7px', gap: '3px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Move Heading #1</span>
                        <select disabled={true} style={{height: '28px', marginLeft: '3px'}} value={MovementDirectionText.get(prop.character?.movement?.directionOne)} onChange={(event) => { dispatch(upateCharSheetMovementOne(parseInt(event.target.value)))} }>
                            {BuildAnimationStatsDirectionText(MovementDirectionText)}
                        </select>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Move Heading #2</span>
                        <select disabled={true} style={{height: '28px'}} value={MovementDirectionText.get(prop.character?.movement?.directionTwo)} onChange={(event) => { dispatch(upateCharSheetMovementTwo(parseInt(event.target.value))) }}>
                            {BuildAnimationStatsDirectionText(MovementDirectionText)}
                        </select>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', gap: '7px', marginTop: '7px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', gap: '7px'}}>
                        <span>X Rate</span>
                        <input type='number' disabled={true} min={0} max={1000} value={prop.character?.movement?.xRate != undefined ? !isNaN(prop.character?.movement?.xRate) && isFinite(prop.character?.movement?.xRate) ? prop.character?.movement?.xRate : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetMovementXRate(value)) }}></input>
                    </span>

                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Y Rate</span>
                        <input type='number' disabled={true} min={0} max={1000} value={prop.character?.movement?.yRate != undefined ? !isNaN(prop.character?.movement?.yRate) && isFinite(prop.character?.movement?.yRate) ? prop.character?.movement?.yRate : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetMovementYRate(value)) }}></input>
                    </span>
                </span>
                <span style={{display: 'inline-block', marginLeft: '17px', marginTop: '17px', marginBottom: '4px', color: 'black'}}>Bounding Box</span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Width</span>
                        <input type='number' disabled={true} min={0} max={100} value={prop.character?.movement?.boundingBox?.xBound != undefined ? !isNaN(prop.character?.movement?.boundingBox?.xBound) && isFinite(prop.character?.movement?.boundingBox?.xBound) ? prop.character?.movement?.boundingBox?.xBound : '' : ''} onChange={(event) => {const value = parseInt(event.target.value); dispatch(updateCharSheetXBound(value)) }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Length</span>
                        <input type='number' disabled={true} min={0} max={100} value={prop.character?.movement?.boundingBox?.yBound != undefined ? !isNaN(prop.character?.movement?.boundingBox?.yBound) && isFinite(prop.character?.movement?.boundingBox?.yBound) ? prop.character?.movement?.boundingBox?.yBound : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetYBound(value)) }}></input>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '7px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>X Origin</span>
                        <input type='number' disabled={true} min={0} max={100} value={prop.character?.movement?.boundingBox?.xOrigin != undefined ? !isNaN(prop.character?.movement?.boundingBox?.xOrigin) && isFinite(prop.character?.movement?.boundingBox?.xOrigin) ? prop.character?.movement?.boundingBox?.xOrigin : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetXOrigin(value)) }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px'}}>
                        <span>Y Origin</span>
                        <input type='number' disabled={true} min={0} max={100} value={prop.character?.movement?.boundingBox?.yOrigin != undefined ? !isNaN(prop.character?.movement?.boundingBox?.xOrigin) && isFinite(prop.character?.movement?.boundingBox?.xOrigin) ? prop.character?.movement?.boundingBox?.xOrigin : '' : ''} onChange={(event) => { const value = parseInt(event.target.value); dispatch(updateCharSheetYOrigin(value)) }}></input>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '7px'}}>
                    <span>Shape</span>
                    <select disabled={true} style={{height: '28px'}} value={AnimationBoundingShapeText.get(prop.character?.movement?.boundingBox.shape)} onChange={(event) => { dispatch(updateCharSheetBoundingBox(parseInt(event.target.value)))}}>
                        {BuildAnimationBoundingShapeText(AnimationBoundingShapeText)}
                    </select>
                </span>
            </span>
            <span style={{display: carrotUpward ? 'inline-block' : 'none', width: '300px', marginTop: '10px', color: 'blanchedalmond', border:'thin 4px', borderTopStyle: 'solid',  borderRightStyle: 'none', borderLeftStyle: 'none', borderBottomStyle: 'none'}}></span>

        </span>
    );
}