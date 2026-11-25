import { nanoid } from "nanoid";
import { CharacterAttribute, CharacterSubType, CharacterType, MatchGroup, NaturalOrientation, PresetSizeIdentifier } from "../../../components/Characters/CharacterMetadata";
import { AnimationBoundingShape, MovementDirection } from "../../models/AnimationStats";
import { CharacterStats } from "../../models/CharacterStats";
import { PageAnimationInfluence } from "../../models/PageAnimationInfluence";
import { PageBreakdown } from "../../models/RuntimeAnimationMetadata";
import { UIBranch } from "../../models/UIBranch";
import { CharacterEditor, charSheetFieldsPreset, ControlPanelCharSheetFields, ControlPanelMenuFields, ControlPanelSettingsFields, menuFields, SettingsAreas, settingsFieldsPreset } from "../SliceStateSpecs";

export const CharacterSizesPresets = new Map([
    [{characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}, {width: 100, height: 52}],
    [{characterType: CharacterType.blimp, id: PresetSizeIdentifier.template}, {width: 56, height: 48}],

    [{characterType: CharacterType.crunch, id: PresetSizeIdentifier.default}, {width: 48, height: 48}],
    [{characterType: CharacterType.crunch, id: PresetSizeIdentifier.template}, {width: 48, height: 48}],
])

export enum AnimationStatus {
    notUsed = 0,
    fresh = 1,
    playing = 2,
    paused = 3,
    stopped = 4,
    reset = 5
}

export type RuntimeMetadata = {
    page: UIBranch,
    breakdown: PageBreakdown[]
}

export type CharacterTracker = {
    page: UIBranch,
    chars: CharacterStats[]
}

export type PageInfluence = {
    page: UIBranch,
    chars: PageAnimationInfluence | null
}

export type AnimationState = {
    persistenceNotice: string | null,
    legacyAvailable: boolean,
    openControlPanel: boolean,
    openSettingsPanel: boolean,
    openControllerPanel: boolean,
    settingsCurrentArea: SettingsAreas,
    characterSheet: CharacterStats[] | null,
    workingChracter: CharacterStats | null,
    menuFields: ControlPanelMenuFields,
    charSheetFields: ControlPanelCharSheetFields,
    settingsFields: ControlPanelSettingsFields,
    rosterPage: UIBranch,
    characterEditor: CharacterEditor
    identifier: NodeJS.Timeout | null;
    playback: AnimationStatus;
    runMargin: number;
    runtimeMetadata: RuntimeMetadata[];
    characterTracker: CharacterTracker[];
    previousPage: UIBranch;
    currentPage: UIBranch;
    pageInfluences: PageInfluence[];
    workingCharacter: CharacterStats | null;
} 

export const initialState: AnimationState = {
    persistenceNotice: null,
    legacyAvailable: false,
    openControlPanel: false,
    openSettingsPanel: false,
    openControllerPanel: false,
    settingsCurrentArea: SettingsAreas.menu,
    characterSheet: null,
    workingChracter: null,
    menuFields: menuFields,
    charSheetFields: charSheetFieldsPreset,
    settingsFields: settingsFieldsPreset,
    rosterPage: UIBranch.homepage,
    characterEditor: CharacterEditor.none,
    identifier: null,
    playback: AnimationStatus.notUsed,
    runMargin: 10,
    runtimeMetadata: [
        {
            page: UIBranch.homepage,
            breakdown: [
                {
                    type: CharacterType.blimp, howMany: 3, subType: CharacterSubType.unset
                },
                {
                    type: CharacterType.crunch, howMany: 1, subType: CharacterSubType.unset
                }
            ]
        },
        {
            page: UIBranch.apps,
            breakdown: []
        },
        {
            page: UIBranch.application,
            breakdown: []
        },
        {
            page: UIBranch.consulting,
            breakdown: []
        },
        {
            page: UIBranch.libraries,
            breakdown: [               
                {
                    type: CharacterType.blimp, howMany: 3, subType: CharacterSubType.unset
                }, 
                {
                    type: CharacterType.crunch, howMany: 1, subType: CharacterSubType.unset
                }
            ]
        },
        {
            page: UIBranch.softwarepackage,
            breakdown: [
                {
                    type: CharacterType.blimp, howMany: 3, subType: CharacterSubType.unset
                },
                {
                    type: CharacterType.crunch, howMany: 1, subType: CharacterSubType.unset
                }
            ]
        },
        {
            page: UIBranch.contact,
            breakdown: [                
                {
                    type: CharacterType.blimp, howMany: 3, subType: CharacterSubType.unset
                },
                {
                    type: CharacterType.crunch, howMany: 0, subType: CharacterSubType.unset
                }
            ]
        }
    ],
    characterTracker: [ 
        {
            page: UIBranch.homepage,
            chars: [
                {
                    prefix: "", type: CharacterType.crunch, subType: CharacterSubType.unset, attributes: [CharacterAttribute.speaking], orientation: NaturalOrientation.neutral, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 30, currentY: 50, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "a magic eight ball is to a flap jack that a letter is to of having subject matter toward cooking bacon", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 250},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.crunch, id: PresetSizeIdentifier.default}) ?? {width: 48, height: 48}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 70, currentY: 50, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.speaking], orientation: NaturalOrientation.leftFacing, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 80, currentY: 464, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "electron scanners defined surfing esports maps", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 65},
                    rotation: 100, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: true}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 400, currentY: 45, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 0, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                }
            ]
        }, 
        {
            page: UIBranch.apps,
            chars: []
        },
        {
            page: UIBranch.application,
            chars: []
        },
        {
            page: UIBranch.consulting,
            chars: []
        },
        {
            page: UIBranch.libraries,
            chars: [
                {
                    prefix: "", type: CharacterType.crunch, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.neutral, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 150, currentY: 200, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                     rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.crunch, id: PresetSizeIdentifier.default}) ?? {width: 48, height: 48}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.speaking], orientation: NaturalOrientation.leftFacing, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 20, currentY: 50, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "Wave runner for Akira", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 2, attachedTo: '', 
                    currentX: 15, currentY: 420, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 3, attachedTo: '', 
                    currentX: 250, currentY: 20, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                }
            ] 
        },
        {
            page: UIBranch.softwarepackage,
            chars: [
                {
                    prefix: "", type: CharacterType.crunch, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.neutral, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 20, currentY: 38, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.crunch, id: PresetSizeIdentifier.default}) ?? {width: 48, height: 48}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 800, currentY: 20, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 2, attachedTo: null, 
                    currentX: 15, currentY: 420, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 3, attachedTo: null, 
                    currentX: 400, currentY: 10, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                }
            ]  
        },
        {
            page: UIBranch.contact,
            chars: [
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.leftFacing,  identifier: nanoid(), index: 1, attachedTo: '', 
                    currentX: 20, currentY: 100, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.rightFacing, identifier: nanoid(), index: 2, attachedTo: '', 
                    currentX: 15, currentY: 420, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                },
                {
                    prefix: "", type: CharacterType.blimp, subType: CharacterSubType.unset, attributes: [CharacterAttribute.none], orientation: NaturalOrientation.leftFacing, identifier: nanoid(), index: 3, attachedTo: '', 
                    currentX: 400, currentY: 60, preCalculated: false, movement: { xInterval: 10, yInterval: 10, directionOne: MovementDirection.right, directionTwo: MovementDirection.right, 
                                                                                 boundingBox: { xBound: 20, yBound: 20, xOrigin: 0, yOrigin: 0, shape: AnimationBoundingShape.square }, 
                                                                                 rotateDegree: 0, xRate: 1, yRate: 1 }, zIndex: 1, matchingGroup: MatchGroup.unset,
                    updated: false, active: true, toRender: true, speaking: "", speakingStats: {width: undefined, height: 50, marginRight: 0, marginLeft: 0, marginTop: 0, marginBottom: 0, rotation: 0, zIndex: 1, useWordWrap: true, wordWrapLength: 30},
                    rotation: 0, delay: 0, sizes: CharacterSizesPresets.get({characterType: CharacterType.blimp, id: PresetSizeIdentifier.default}) ?? {width: 100, height: 52}, switches: {outputSpeaking: true, useHighlighter: true, uprightHighlighter: false}
                }
            ]
        },
        {
            page: UIBranch.userprivacy,
            chars: []
        }
    ],
    previousPage: UIBranch.homepage,
    currentPage: UIBranch.homepage,
    pageInfluences: [
        {
            page: UIBranch.homepage,
            chars: PageAnimationInfluence.linear
        },
        {
            page: UIBranch.apps,
            chars: null
        },
        {
            page: UIBranch.application,
            chars: null
        },
        {
            page: UIBranch.consulting,
            chars: null
        },
        {
            page: UIBranch.libraries,
            chars: PageAnimationInfluence.linear
        },
        {
            page: UIBranch.softwarepackage,
            chars: PageAnimationInfluence.linear
        },
        {
            page: UIBranch.contact,
            chars: null
        },
        {
            page: UIBranch.userprivacy,
            chars: null
        }
    ],
    workingCharacter: null
}