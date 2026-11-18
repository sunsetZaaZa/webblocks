import { CharacterSubType, CharacterType } from "../../components/Characters/CharacterMetadata";

export type PageBreakdown = {
    type: CharacterType;
    subType: CharacterSubType
    howMany: number;
}
