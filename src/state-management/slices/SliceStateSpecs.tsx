import { CharacterAttribute, CharacterSubType, CharacterType, NaturalOrientation } from "../../components/Characters/CharacterMetadata"
import { AnimationBoundingShape, MovementDirection } from "../models/AnimationStats"
import { CharacterStats } from "../models/CharacterStats"
import { UIBranch } from "../models/UIBranch"

export type ControlPanelState = {
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
}

export enum SettingsAreas {
    menu = 0,
    chracterSheet = 1,
    settings = 2,
}

export enum CharacterEditor {
    none = 0,
    template =  1,
    roster = 2,
}

export type ControlPanelMenuFields = {
    presistCharacters: boolean,
    targetFPS: number,
    showFPS: boolean,
    runLength: number,
    nonStop: boolean,
}

export const menuFields: ControlPanelMenuFields = { 
    presistCharacters: true,
    targetFPS: 23,
    showFPS: false,
    runLength: 10,
    nonStop: false,
}

export type ControlPanelCharSheetFields = {
    character: CharacterStats,
    animationPathing: number,
    xCordThreshold: number | null,
    yCordThreshold: number | null,
    validLayout: boolean,
}

export type ControlPanelSettingsFields = {
    juggleAnimationBounding: boolean,
}

export const settingsFieldsPreset: ControlPanelSettingsFields = { //TODO: export of a let ? 
    juggleAnimationBounding: false,
}

export const charSheetFieldsPreset: ControlPanelCharSheetFields = {
    character: {
        prefix: "",
        type: CharacterType.unset,
        subType: CharacterSubType.unset,
        attributes: [CharacterAttribute.none],
        orientation: NaturalOrientation.neutral,
        identifier: "",
        index: 0,
        attachedTo: "",
        currentX: 1,
        currentY: 1,
        sizes: {height: 0, width: 0},
        preCalculated: false,
        movement: {
            xInterval: 0,
            yInterval: 0,
            directionOne: MovementDirection.static,
            directionTwo: MovementDirection.static,
            boundingBox: {
                xBound: 0,
                yBound: 0,
                xOrigin: 0,
                yOrigin: 0,
                shape: AnimationBoundingShape.triangle
            },
            rotateDegree: 0,
            xRate: 0,
            yRate: 0
        },
        updated: false,
        active: false,
        toRender: true,
        speakingStats: {
            width: undefined,
            height: 50,
            marginRight: 0,
            marginLeft: 0,
            marginTop: 0,
            marginBottom: 0,
            rotation: 0,
            zIndex: 0,
            useWordWrap: true,
            wordWrapLength: 300,
        },
        speaking: "",
        rotation: 0,
        delay: 0,
        zIndex: 0,
    },
    animationPathing: -1, //TODO: design enum and functions to go with each enum
    xCordThreshold: 10000,
    yCordThreshold: 10000,
    validLayout: true, //TODO: change to false at some point and have a validate function that produces true/false for a reduce to consume via dispatch
    
}

export const initialState: ControlPanelState = {
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
}