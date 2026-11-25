import {
  CharacterAttribute,
  CharacterSubType,
  CharacterType,
  MatchGroup,
  NaturalOrientation,
} from '../../../components/Characters/CharacterMetadata'
import {
  AnimationBoundingShape,
  MovementDirection,
} from '../../../state-management/models/AnimationStats'
import {
  type CharacterStats,
  MendCharacterStats,
} from '../../../state-management/models/CharacterStats'

const baseMovement = {
  xInterval: 10,
  yInterval: 10,
  directionOne: MovementDirection.right,
  directionTwo: MovementDirection.right,
  boundingBox: {
    xBound: 20,
    yBound: 20,
    xOrigin: 0,
    yOrigin: 0,
    shape: AnimationBoundingShape.square,
  },
  rotateDegree: 0,
  xRate: 1,
  yRate: 1,
}

export const createCharacterFixture = (
  character: CharacterStats,
): CharacterStats => {
  return MendCharacterStats({
    prefix: '',
    subType: CharacterSubType.unset,
    attributes: [CharacterAttribute.none],
    orientation: NaturalOrientation.neutral,
    attachedTo: '',
    preCalculated: false,
    movement: baseMovement,
    updated: false,
    active: true,
    toRender: true,
    speaking: '',
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
      wordWrapLength: 125,
    },
    rotation: 0,
    delay: 0,
    zIndex: 1,
    switches: {
      outputSpeaking: true,
      useHighlighter: true,
      uprightHighlighter: false,
    },
    matchingGroup: MatchGroup.unset,
    ...character,
  })
}

export const characterFixtures = {
  emptyTemplate: createCharacterFixture({
    identifier: '',
    type: CharacterType.unset,
    active: false,
    currentX: 1,
    currentY: 1,
    sizes: { width: 0, height: 0 },
  }),
  templateCrunch: createCharacterFixture({
    identifier: 'template-crunch',
    type: CharacterType.crunch,
    index: 0,
    currentX: 48,
    currentY: 64,
    sizes: { width: 48, height: 48 },
  }),
  speakingCrunch: createCharacterFixture({
    identifier: 'roster-crunch-speaker',
    type: CharacterType.crunch,
    attributes: [CharacterAttribute.speaking],
    index: 1,
    currentX: 30,
    currentY: 50,
    sizes: { width: 48, height: 48 },
    speaking: 'Storybook wiring is alive and politely caffeinated.',
  }),
  rightFacingBlimp: createCharacterFixture({
    identifier: 'roster-blimp-right',
    type: CharacterType.blimp,
    orientation: NaturalOrientation.rightFacing,
    index: 2,
    currentX: 70,
    currentY: 50,
    sizes: { width: 100, height: 52 },
  }),
  appsBlimp: createCharacterFixture({
    identifier: 'apps-blimp',
    type: CharacterType.blimp,
    orientation: NaturalOrientation.leftFacing,
    index: 1,
    currentX: 20,
    currentY: 40,
    sizes: { width: 72, height: 72 },
  }),
  contactCrunch: createCharacterFixture({
    identifier: 'contact-crunch',
    type: CharacterType.crunch,
    index: 1,
    currentX: 40,
    currentY: 30,
    sizes: { width: 72, height: 72 },
  }),
} satisfies Record<string, CharacterStats>

export const rosterCharacterFixtures = {
  homepage: [
    characterFixtures.speakingCrunch,
    characterFixtures.rightFacingBlimp,
  ],
  mobileApps: [characterFixtures.appsBlimp],
  contact: [characterFixtures.contactCrunch],
} satisfies Record<string, CharacterStats[]>
