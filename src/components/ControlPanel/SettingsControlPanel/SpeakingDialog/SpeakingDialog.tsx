import { useId, useState } from "react";
import { useDispatch } from "react-redux";

import { CharacterStats } from "../../../../state-management/models/CharacterStats";
import { updateCharSheetDialogHeight, updateCharSheetDialogMarginBottom, updateCharSheetDialogMarginLeft, updateCharSheetDialogMarginRight, updateCharSheetDialogMarginTop, updateCharSheetDialogRotation, updateCharSheetDialogUseWordWrap, updateCharSheetDialogWidth, updateCharSheetDialogWordWrapLength, updateCharSheetDialogZIndex, updateCharSheetSpeaking } from "../../../../state-management/slices/AnimationSlice";
import { CollapsibleSettingsHeader } from "../CollapsibleSettingsHeader/CollapsibleSettingsHeader";

export type SpeakingDialogPropSpec = {
    character: CharacterStats
}

export const SpeakingDialog = (prop: SpeakingDialogPropSpec) => {
    const dispatch = useDispatch();
    const [carrotUpward, setCarrotUpward] = useState<boolean>(false);
    const speakingSettingsPanelId = useId();

    return (
        <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
            <CollapsibleSettingsHeader
                controlsId={speakingSettingsPanelId}
                expanded={carrotUpward}
                onToggle={() => {setCarrotUpward(!carrotUpward)}}
                title="Speaking Settings"
            />
            <span id={speakingSettingsPanelId} hidden={!carrotUpward} style={{display: carrotUpward ? 'flex': 'none', flexDirection: 'column', flexWrap: 'nowrap'}}>
                <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
                    <span style={{display: 'inline-block'}}>Dialog</span>
                    <input type='text' value={prop.character.speaking ?? ''} style={{height: '20px'}} onChange={(event) => { dispatch(updateCharSheetSpeaking(event.target.value)); }}></input>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '5px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Height</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.height != undefined ? !isNaN(prop.character?.speakingStats?.height) && isFinite(prop.character?.speakingStats.height) ? prop.character?.speakingStats.height : '' : ''} onChange={(event) => { const castedInt: number = parseInt(event.target.value); if(event.target.value == '' || (isNaN(castedInt) == false && Number.isInteger(castedInt))) { dispatch(updateCharSheetDialogHeight(castedInt)); } }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Width</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.width} onChange={(event) => { dispatch(updateCharSheetDialogWidth(parseInt(event.target.value))); }}></input>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '7px', alignItems: 'center'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px', alignItems: 'center'}}>
                        <span>Word Wrap</span>
                        <input type='checkbox' checked={prop.character?.speakingStats?.useWordWrap ?? true} onChange={(event) => { dispatch(updateCharSheetDialogUseWordWrap(event.target.checked)); }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Wrap At (px)</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.wordWrapLength != undefined ? !isNaN(prop.character?.speakingStats?.wordWrapLength) && isFinite(prop.character?.speakingStats?.wordWrapLength) ? prop.character?.speakingStats?.wordWrapLength : '' : ''} onChange={(event) => { const castedInt: number = parseInt(event.target.value); if(event.target.value == '' || (isNaN(castedInt) == false && Number.isInteger(castedInt))) { dispatch(updateCharSheetDialogWordWrapLength(castedInt)); } }}></input>
                    </span>
                </span>
                <span style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '7px', marginBottom: '3px'}}>Offset</span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '15px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Right</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.marginRight != undefined ? !isNaN(prop.character?.speakingStats?.marginRight) && isFinite(prop.character?.speakingStats?.marginRight) ? prop.character?.speakingStats?.marginRight : '' : ''} onChange={(event) => { dispatch(updateCharSheetDialogMarginRight(parseInt(event.target.value))); }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Left</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.marginLeft != undefined ? !isNaN(prop.character?.speakingStats?.marginLeft) && isFinite(prop.character?.speakingStats?.marginLeft) ? prop.character?.speakingStats?.marginLeft : '' : ''} onChange={(event) => { dispatch(updateCharSheetDialogMarginLeft(parseInt(event.target.value))); }}></input>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '7px'}}>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Ceiling</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.marginTop != undefined ? !isNaN(prop.character?.speakingStats?.marginTop) && isFinite(prop.character?.speakingStats?.marginTop) ? prop.character?.speakingStats?.marginTop : '' : ''} onChange={(event) => { dispatch(updateCharSheetDialogMarginTop(parseInt(event.target.value))); }}></input>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px'}}>
                        <span>Floor</span>
                        <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.marginBottom != undefined ? !isNaN(prop.character?.speakingStats?.marginBottom) && isFinite(prop.character?.speakingStats?.marginBottom) ? prop.character?.speakingStats?.marginBottom : '' : ''} onChange={(event) => { dispatch(updateCharSheetDialogMarginBottom(parseInt(event.target.value))); }}></input>
                    </span>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '10px'}}>
                    <span>Rotation</span>
                    <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.rotation != undefined ? !isNaN(prop.character?.speakingStats?.rotation) && isFinite(prop.character?.speakingStats?.rotation) ? prop.character?.speakingStats?.rotation : '' : ''} onChange={(event) => { dispatch(updateCharSheetDialogRotation(parseInt(event.target.value))); }}></input>
                </span>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '7px', marginTop: '10px'}}>
                    <span>Visual Layer</span>
                    <input type='number' style={{width: '75px'}} value={prop.character?.speakingStats?.zIndex != undefined ? !isNaN(prop.character?.speakingStats?.zIndex) && isFinite(prop.character?.speakingStats?.zIndex) ? prop.character?.speakingStats?.zIndex : '' : ''} onChange={(event) => { dispatch(updateCharSheetDialogZIndex(parseInt(event.target.value))); }}></input>
                </span>
            </span>
        </span>
    );
    
}