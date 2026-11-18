import { useDispatch } from "react-redux";

import { putCharacterToSheetFromTemplate } from "../../../state-management/slices/AnimationSlice";
import { CharacterType } from "../../Characters/CharacterMetadata";
import { Blimp } from "../../Characters/Blimp/Blimp";
import { Crunch } from "../../Characters/Crunch/Crunch";


import { TemplateScrollSpawnerProp } from "./TemplateSpawnerTypes";

export const TemplateSpawner = (props: TemplateScrollSpawnerProp[]) => {
    const dispatch = useDispatch();

    const autoGen = [];
    props.forEach((entry) => {
        if(entry.character.type == CharacterType.blimp) {
            autoGen.push(<Blimp key={entry.character.identifier} info={entry.character} onClick={() => { dispatch(putCharacterToSheetFromTemplate(entry.character)) }}></Blimp>)
        } else if(entry.character.type == CharacterType.crunch) {
            autoGen.push(<Crunch key={entry.character.identifier} info={entry.character} onClick={() => { dispatch(putCharacterToSheetFromTemplate(entry.character)) }}></Crunch>)
        }
    });
    return autoGen;
}

