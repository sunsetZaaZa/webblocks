import { siteConfig } from "../../config/site";
import type { ReactElement } from "react";

import { UIBranch } from "../../state-management/models/UIBranch";
import { CharacterTracker } from "../../state-management/slices/presets/AnimationPreset";
import { CharacterType } from "./CharacterMetadata";

import { Crunch } from './Crunch/Crunch';
import { Blimp } from "./Blimp/Blimp";


export const BuildCharacterElements = (charStats: CharacterTracker[], uiBranch: UIBranch): ReactElement[] => {
    if (!siteConfig.features.characters) return [];
    const autoGen: ReactElement[] = [];
    charStats.forEach((charTrackEntry) => {
        if(charTrackEntry.page == uiBranch) {
            charTrackEntry.chars.forEach((character) => {
                if(character.type == CharacterType.blimp) {
                    autoGen.push(<Blimp key={character.identifier} info={character}></Blimp>);
                } else if(character.type == CharacterType.crunch) {
                    autoGen.push(<Crunch key={character.identifier} info={character}></Crunch>);
                }
            });
        }
    });
    return autoGen;
}