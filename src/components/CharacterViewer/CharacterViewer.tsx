import { JSX } from "react";

import { CharacterPropSpec, CharacterType } from "../Characters/CharacterMetadata";
import { Crunch } from "../Characters/Crunch/Crunch";
import { Blimp } from "../Characters/Blimp/Blimp";

export const CharacterViewer = (prop: CharacterPropSpec) => {
    let autoGen: JSX.Element;

    if(prop.info.type == CharacterType.crunch) {
        autoGen = <Crunch key={prop.info.identifier} info={{...prop.info, currentX: undefined, currentY: undefined, zIndex: 1, switches: {outputSpeaking: false, useHighlighter: false}}} styling={{position: 'absolute'}}></Crunch>
    } else if(prop.info.type == CharacterType.blimp) {
        autoGen = <Blimp key={prop.info.identifier} info={{...prop.info, currentX: undefined, currentY: undefined, zIndex: 1, switches: {outputSpeaking: false, useHighlighter: false}}} styling={{position: 'absolute'}}></Blimp>;
    }
    return autoGen;
}