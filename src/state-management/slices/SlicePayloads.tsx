import { CharacterStats } from "../models/CharacterStats"
import { UIBranch } from "../models/UIBranch"

export type UpdateTokenPayload = {
  token: NodeJS.Timeout,
  currentPage: UIBranch | undefined
}

export type UpdateFramePayload = {
  uiBranch: UIBranch,
  charStats: CharacterStats[]
}

export type AddCharacterPayload = {
  uiBranch: UIBranch,
  charStat: CharacterStats
}

export type UpdateCharacterPayload = {
  uiBranch: UIBranch,
  charStat: CharacterStats
}

export type RemoveCharacterPayload = {
  uiBranch: UIBranch,
  identifier: string
}

export type AddCharacterPayloadBulk = {
  uiBranch: UIBranch,
  charStat: CharacterStats[]
}

export type UpdateCharacterPayloadBulk = {
  uiBranch: UIBranch,
  charStat: CharacterStats[]
}

export type RemoveCharacterPayloadBulk = {
  uiBranch: UIBranch,
  identifiers: string[]
}