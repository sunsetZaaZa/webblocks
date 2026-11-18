import { nanoid } from "nanoid";
import { AttributeText, CharacterAttribute, CharacterSubType, CharacterSubTypeText, CharacterType, CharacterTypeText, NaturalOrientation, NaturalOrientationText } from "../../Characters/CharacterMetadata";

export const BuildCharacterTypeOptions = (charTypes:  Map<CharacterType, string> | null = CharacterTypeText) => {
    const autoGen = [];
    if(charTypes != null) {
        charTypes.forEach((entry, key) => { autoGen.push(<option key={nanoid()}value={key}>{entry}</option>); }); 
    }
    return autoGen;
}

export const BuildCharacterSubTypeOptions = (charSubTypes:  Map<CharacterSubType, string> | null = CharacterSubTypeText) => {
    const autoGen = [];
    if(charSubTypes != null) {
        charSubTypes.forEach((entry, key) => { autoGen.push(<option key={nanoid()}value={key}>{entry}</option>); }); 
    }
    return autoGen;
}

export const BuildCharacterAttributeOptions = (attributeTypes: Map<CharacterAttribute, string> | null = AttributeText) => {
    const autoGen = [];
    if(attributeTypes != null) {
        attributeTypes.forEach((entry, key) => { autoGen.push(<option key={nanoid()}value={key}>{entry}</option>); }); 
    }
    return autoGen;
}

export const BuildCharacterOrientationOptions = (naturalOrientation: Map<NaturalOrientation, string> | null = NaturalOrientationText) => {
    const autoGen = [];
    if(naturalOrientation != null) {
        naturalOrientation.forEach((entry, key) => { autoGen.push(<option key={nanoid()}value={key}>{entry}</option>); }); 
    }
    return autoGen;
}