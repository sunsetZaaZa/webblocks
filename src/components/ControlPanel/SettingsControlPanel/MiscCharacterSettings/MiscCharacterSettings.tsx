import { useId, useState } from "react";
import { useDispatch } from "react-redux";

import { CharacterStats } from "../../../../state-management/models/CharacterStats";
import { updateCharSheetUprightHighlighter } from "../../../../state-management/slices/AnimationSlice";
import { CollapsibleSettingsHeader } from "../CollapsibleSettingsHeader/CollapsibleSettingsHeader";

export type SpeakingDialogPropSpec = {
    character: CharacterStats
}

export const MiscCharacterSettings = (prop: SpeakingDialogPropSpec) => {
    const dispatch = useDispatch();
    const [carrotUpward, setCarrotUpward] = useState<boolean>(false);
    const miscSettingsPanelId = useId();

    return (
        <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
            <CollapsibleSettingsHeader
                controlsId={miscSettingsPanelId}
                expanded={carrotUpward}
                onToggle={() => {setCarrotUpward(!carrotUpward)}}
                title="Misc Settings"
            />
            <span id={miscSettingsPanelId} hidden={!carrotUpward} style={{display: carrotUpward ? 'flex': 'none', flexDirection: 'column', flexWrap: 'nowrap'}}>
                <span style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap'}}>
                    <span style={{display: 'inline-block', marginLeft: 'auto', marginRight: 'auto'}}>Use Upright Highlighter Markings</span>
                    <input type="checkbox" checked={prop.character?.switches?.uprightHighlighter ?? false} style={{height: '20px'}} onChange={(event) => { dispatch(updateCharSheetUprightHighlighter(event.target.checked)); }}></input>
                </span>

            </span>
        </span>
    );
    
}