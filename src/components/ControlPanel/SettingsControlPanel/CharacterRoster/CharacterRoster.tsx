import { nanoid } from 'nanoid';
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../../../state-management/store';
import { UIBranch } from '../../../../state-management/models/UIBranch';
import { CharacterStats } from '../../../../state-management/models/CharacterStats';
import { CharacterType } from '../../../Characters/CharacterMetadata';
import { Blimp } from '../../../Characters/Blimp/Blimp';
import { Crunch } from '../../../Characters/Crunch/Crunch';
import { putCharacterToSheetFromRoster } from '../../../../state-management/slices/AnimationSlice';
import { SelectionHighlight } from '../../../Modifiers/SelectionHighlight/SelectionHighlight';

export type CharacterRosterProps = {
    shouldDisplay: string;
}

export const CharacterRoster = (props: CharacterRosterProps) => {
    const dispatch = useDispatch();
    const panelRef = useRef<string>(nanoid());
    const currentPage: UIBranch = useSelector((state: RootState) => state.animation.rosterPage);
    const characterStats: CharacterStats[] = useSelector((state: RootState) => state.animation.characterTracker.find(entry => entry.page == currentPage))?.chars;
    const selectedCharacter: string = useSelector((state: RootState) => state.animation.charSheetFields.character.identifier);

    const autoGen = [];

    if(characterStats != undefined) {
        characterStats.forEach(entry => {
            if(entry.type == CharacterType.blimp) {
                autoGen.push(<SelectionHighlight key={entry.identifier} styling={{marginLeft: 'auto', marginRight: 'auto', paddingLeft: '10px', paddingRight: '10px' }} actuallyUse={true} movingTarget={selectedCharacter} toHighlight={entry.identifier}>
                                <Blimp info={{ orientation: entry.orientation, sizes: entry.sizes, zIndex: 1, switches: {useHighlighter: false, uprightHighlighter: false}}} onClick={() => { dispatch(putCharacterToSheetFromRoster(entry)); }}></Blimp>
                            </SelectionHighlight> 
                )
            } else if(entry.type == CharacterType.crunch) {
                autoGen.push(<SelectionHighlight  key={entry.identifier} styling={{ marginLeft: 'auto', marginRight: 'auto', paddingLeft: '10px', paddingRight: '10px' }} actuallyUse={true} movingTarget={selectedCharacter} toHighlight={entry.identifier}>
                                <Crunch info={{orientation: entry.orientation, sizes: entry.sizes, zIndex: 1, switches: {useHighlighter: false, uprightHighlighter: false}}} onClick={() => { dispatch(putCharacterToSheetFromRoster(entry)) }}></Crunch>
                            </SelectionHighlight>
                )
            }
        });
    }

    return (
        <span key={panelRef.current} style={{display: props.shouldDisplay, flexDirection: 'column', flexWrap: 'nowrap', height: '17rem', width: '12rem', backgroundColor: 'gray', borderRadius: '2px', paddingTop: '7px'}}>
            <span style={{display: 'inline-block', marginLeft: 'auto', marginRight: 'auto'}}>Roster</span>
            <span style={{display: 'inline-block', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(44, 44, 35, 0.782) rgba(255, 255, 255, 0)', scrollBehavior: 'smooth'}}>
                <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', paddingLeft: '30px', paddingRight: '30px'}}>
                    {autoGen}
                </span>
            </span>
        </span>
    )
}


