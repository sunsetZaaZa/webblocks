import type { ReactElement } from "react";
import { nanoid } from "nanoid";

import { UIBranch } from "../../state-management/models/UIBranch";
import { CharacterTracker } from "../../state-management/slices/presets/AnimationPreset";
import { CharacterType } from "./CharacterMetadata";

import { Crunch } from './Crunch/Crunch';
import { Blimp } from "./Blimp/Blimp";


export const BuildCharacterElements = (charStats: CharacterTracker[], uiBranch: UIBranch): ReactElement[] => {
    const autoGen: ReactElement[] = [];
    charStats.forEach((charTrackEntry) => {
        if(charTrackEntry.page == uiBranch) {
            charTrackEntry.chars.forEach((character) => {
                if(character.type == CharacterType.blimp) {
                    autoGen.push(<Blimp key={nanoid()} info={character}></Blimp>);
                } else if(character.type == CharacterType.crunch) {
                    autoGen.push(<Crunch key={nanoid()} info={character}></Crunch>);
                }
            });
        }
    });
    return autoGen;
}