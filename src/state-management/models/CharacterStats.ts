import { CharacterAttribute, CharacterPresetSize, CharacterSubType, CharacterType, MatchGroup, NaturalOrientation } from "../../components/Characters/CharacterMetadata";
import { AnimationBoundingBox, AnimationBoundingShape, AnimationStats, MovementDirection } from "./AnimationStats";

export type CharacterSwitches = {
  outputSpeaking?: boolean,
  useHighlighter?: boolean,
  uprightHighlighter?: boolean,
}

export type SpeakingPropSpec = {
  width?: number,
  height?: number,
  marginRight?: number,
  marginLeft?: number,
  marginTop?: number,
  marginBottom?: number,
  rotation?: number,
  zIndex?: number,
  useWordWrap?: boolean,
  wordWrapLength?: number
}

export type CharacterStats = {
    prefix?: string;
    type?: CharacterType;
    subType?: CharacterSubType;
    attributes?: CharacterAttribute[];
    orientation?: NaturalOrientation;
    identifier?: string;
    index?: number;
    attachedTo?: string | null;
    currentX?: number;
    currentY?: number;
    preCalculated?: boolean;
    movement?: AnimationStats | null;
    updated?: boolean;
    active?: boolean;
    toRender?: boolean;
    speaking?: string;
    speakingStats?: SpeakingPropSpec;
    rotation?: number;
    delay?: number;
    zIndex?: number;
    sizes?: CharacterPresetSize;
    switches?: CharacterSwitches;
    credits?: string;
    matchingGroup?: MatchGroup;
}

const defaultMovement: AnimationStats & { boundingBox: AnimationBoundingBox } = {
  xInterval: 0,
  yInterval: 0,
  directionOne: MovementDirection.static,
  directionTwo: MovementDirection.static,
  boundingBox: {
    xBound: 0,
    yBound: 0,
    xOrigin: 0,
    yOrigin: 0,
    shape: AnimationBoundingShape.triangle,
  },
  rotateDegree: 0,
  xRate: 0,
  yRate: 0,
};
const defaultSize: CharacterPresetSize = { height: 0, width: 0 };

export const mendWithConstant: CharacterStats = {
    prefix: "",
    type: CharacterType.unset,
    subType: CharacterSubType.unset,
    attributes: [CharacterAttribute.none],
    orientation: NaturalOrientation.neutral,
    identifier: "",
    index: -1,
    attachedTo: "",
    currentX: 0,
    currentY: 0,
    preCalculated: false,
    movement: { ...defaultMovement, boundingBox: { ...defaultMovement.boundingBox } },
    updated: false,
    active: false,
    toRender: true,
    speaking: "",
    speakingStats: {
      width: undefined,
      height: 50,
      marginRight: 0,
      marginLeft: 0,
      marginTop: 0,
      marginBottom: 0,
      rotation: 0,
      zIndex: 1,
      useWordWrap: true,
      wordWrapLength: 300,
    },
    rotation: 0,
    delay: 0,
    zIndex: 1,
    sizes: { ...defaultSize },
    switches: {outputSpeaking: true, useHighlighter: false, uprightHighlighter: true},
    credits: "",
    matchingGroup: MatchGroup.unset
}

export const MendCharacterStats = (object: CharacterStats, mendWith = mendWithConstant) => {
  const mendedCharacter: CharacterStats = {
    ...mendWith,
    ...object,
    movement: {
      ...defaultMovement,
      ...mendWith.movement,
      ...object.movement,
      boundingBox: {
        ...defaultMovement.boundingBox,
        ...mendWith.movement?.boundingBox,
        ...object.movement?.boundingBox,
      },
    },
    speakingStats: {
      ...mendWith.speakingStats,
      ...object.speakingStats,
    },
    sizes: {
      ...defaultSize,
      ...mendWith.sizes,
      ...object.sizes,
    },
    switches: {
      ...mendWith.switches,
      ...object.switches,
    },
  };

  if(mendedCharacter.rotation == undefined || mendedCharacter.rotation == null) {
    mendedCharacter.rotation = mendWith.rotation
  }

  return mendedCharacter;
}
