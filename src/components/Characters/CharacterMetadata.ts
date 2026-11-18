import { CharacterStats } from "../../state-management/models/CharacterStats"

export interface CharacterStylingSpec {
    right?: number,
    currentX?: number,
    currentY?: number,
    top?: number,
    position?: string,
    rotation?: number,
    marginRight?: string,
    marginLeft?: string,
    marginTop?: string,
    marginBottom?: string,
    paddingLeft?: string,
    paddingRight?: string,
    paddingBottom?: string,
    paddingTop?: string,
    height?: number,
    width?: number,
    zIndex?: number,
} 

export type CharacterPropSpec = {
    info: CharacterStats,
    useKey?: boolean,
    styling?: CharacterStylingSpec,
    onClick?: () => void,
}

export enum CharacterType {
    unset = 0,
    crunch = 1,
    blimp = 2,
}

export enum MatchGroup {
    unset = 0,
    rawr = 1
}

export const CharacterTypeText = new Map([
    [CharacterType.unset, 'Not Set'],
    [CharacterType.crunch, 'Crunch'],
    [CharacterType.blimp, 'Blimp'],
])

export enum CharacterSubType {
    unset = 0,
}

export const CharacterSubTypeText = new Map([
    [CharacterSubType.unset, 'Not Set'],
])

export enum CharacterAttribute {
    none = 0,
    speaking = 1
}

export const AttributeText = new Map([
    [CharacterAttribute.none, 'None'],
    [CharacterAttribute.speaking, 'Speaking'],
])

export enum NaturalOrientation {
    neutral = 0,
    rightFacing = 1,
    leftFacing = 2
}

export const NaturalOrientationText = new Map([
    [NaturalOrientation.neutral, 'Neutral'],
    [NaturalOrientation.rightFacing, 'Right Facing'],
    [NaturalOrientation.leftFacing, 'Left Facing'],
])

export enum PresetSizeIdentifier {
    default = 1,
    template = 2,
    custom = 3,
}

export type PresetSizeBundle = {
    characterType: CharacterType,
    id: PresetSizeIdentifier,
}

export type CharacterPresetSize = {
    width: number,
    height: number
}