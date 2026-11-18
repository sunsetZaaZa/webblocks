import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { nanoid } from 'nanoid';

import { AnimationStatus, CharacterTracker, initialState } from './presets/AnimationPreset';
import { UIBranch } from '../models/UIBranch';
import { CharacterStats, MendCharacterStats, mendWithConstant } from '../models/CharacterStats';

import { CharacterAttribute } from '../../components/Characters/CharacterMetadata';
import { AddCharacterPayload, AddCharacterPayloadBulk, RemoveCharacterPayload, RemoveCharacterPayloadBulk, UpdateCharacterPayload, UpdateCharacterPayloadBulk, UpdateFramePayload, UpdateTokenPayload } from './SlicePayloads';
import { CharacterEditor, SettingsAreas } from './SliceStateSpecs';

export const AnimationSlice = createSlice({
  name: 'AnimationSlice',
  initialState,
  reducers: {
    nextFrame: (state, message: PayloadAction<UpdateFramePayload>) => {
      const index: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
      const holdOver: CharacterTracker[] = [...state.characterTracker];
      holdOver[index].chars = message.payload.charStats;
      state.characterTracker = holdOver;
    },
    updateToken: (state, message: PayloadAction<UpdateTokenPayload>) => {
      state.identifier = message.payload.token;
      if(message.payload.currentPage !== undefined) {
        state.previousPage = state.currentPage;
        state.currentPage = message.payload.currentPage;
      }
    },
    clearToken: (state) => {
      state.identifier = null;
    },
    setPages: (state, message: PayloadAction<UIBranch>) => {
      state.previousPage = state.currentPage;
      state.currentPage = message.payload;
    },
    playAnimation: () => { //call normal engine cycle

    },
    resumeAnimation: () => { //call engine cycle with current characterTracker

    },
    resetAnimation: () => { //clear Interval & revert back to previous x & y cords

    },
    pauseAnimation: () => { //clear Interval

    },
    stopAnimation: () => { //clear Interval 

    },
    addCharacterToRoster: (state, message: PayloadAction<AddCharacterPayload>) => {
      if(state.playback != AnimationStatus.playing && state.playback != AnimationStatus.reset) { //could check for same x & y of same type & rotation
        const pageIndex: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
        const freshCharacterTracker = [...state.characterTracker[pageIndex].chars];
        const character: CharacterStats = {...message.payload.charStat};
        if(isNaN(message.payload.charStat.currentX) || message.payload.charStat.currentX <= 0) {
          character.currentX = 1;
        }
        if(isNaN(message.payload.charStat.currentY) || message.payload.charStat.currentY <= 0) {
          character.currentY = 1;
        }
        character.identifier = nanoid();
        if(character.speaking != undefined && character.speaking.length > 0) {
          let isSpeaking: number = -1;
          isSpeaking = character.attributes.findIndex(entry => entry == CharacterAttribute.speaking);
          if(isSpeaking == -1) {
            character.attributes = [...character.attributes, CharacterAttribute.speaking]
          }
          character.switches = {outputSpeaking: true};
        }

        freshCharacterTracker.push(character);
        state.characterTracker[pageIndex].chars = freshCharacterTracker;

        state.charSheetFields.character = mendWithConstant;
      }
    },
    removeCharacterFromRoster: (state, message: PayloadAction<RemoveCharacterPayload>) => {
      if(state.playback != AnimationStatus.playing && state.playback != AnimationStatus.reset) { //could check for same x & y of same type & rotation
        const pageIndex: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
        let freshCharacterTracker = [...state.characterTracker[pageIndex].chars];
        freshCharacterTracker = freshCharacterTracker.filter(entry => entry.identifier != message.payload.identifier);
        state.characterTracker[pageIndex].chars = freshCharacterTracker;
      }
    },
    updateCharacterWithinRoster: (state, message: PayloadAction<UpdateCharacterPayload>) => {
      if(state.playback != AnimationStatus.playing && state.playback != AnimationStatus.reset) { //could check for same x & y of same type & rotation
        const pageIndex: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
        const freshCharacterTracker = [...state.characterTracker[pageIndex].chars];
        const characterIndex = freshCharacterTracker.findIndex(entry => entry.identifier == message.payload.charStat.identifier);
        freshCharacterTracker[characterIndex] = message.payload.charStat;
        state.characterTracker[pageIndex].chars = freshCharacterTracker;
      }
    },
    bulkAddCharactersToRoster: (state, message: PayloadAction<AddCharacterPayloadBulk>) => {
      if(state.playback != AnimationStatus.playing && state.playback != AnimationStatus.reset) { //could check for same x & y of same type & rotation
        const pageIndex: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
        const freshCharacterTracker = [...state.characterTracker[pageIndex].chars];
        message.payload.charStat.forEach(entry => {
          freshCharacterTracker.push(entry);
        });
        state.characterTracker[pageIndex].chars = freshCharacterTracker;
      }
    },
    bulkUpdateCharactersWithinRoster: (state, message: PayloadAction<UpdateCharacterPayloadBulk>) => {
        const pageIndex: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
        const freshCharacterTracker = [...state.characterTracker[pageIndex].chars];
        let characterIndex: number;
        message.payload.charStat.forEach(entry => {
          characterIndex = state.characterTracker[pageIndex].chars.findIndex(character => character.identifier == entry.identifier);
          freshCharacterTracker[characterIndex] = entry;
        });
        state.characterTracker[pageIndex].chars = freshCharacterTracker;
    },
    bulkRemoveCharactersFromRoster: (state, message: PayloadAction<RemoveCharacterPayloadBulk>) => {
      if(state.playback != AnimationStatus.playing && state.playback != AnimationStatus.reset) { //could check for same x & y of same type & rotation
        const pageIndex: number = state.characterTracker.findIndex(entry => entry.page == message.payload.uiBranch);
        let freshCharacterTracker = [...state.characterTracker[pageIndex].chars];
        message.payload.identifiers.forEach(toRemove => {
          freshCharacterTracker = freshCharacterTracker.filter(entry => entry.identifier != toRemove);
        });
        state.characterTracker[pageIndex].chars = freshCharacterTracker;
      }
    },
    openControlPanel: (state) => {
      state.openControlPanel = true;
    },
    closeControlPanel: (state) => {
      state.openControlPanel = false;
    },
    openSettingsPanel: (state) => {
      state.openSettingsPanel = true;
    },
    closeSettingsPanel: (state) => {
      state.openSettingsPanel = false;
    },
    openControllerPanel: (state) => {
      state.openControllerPanel = true;
    },
    closeControllerPanel: (state) => {
      state.openControllerPanel = false;
    },
    settingsPanelArea: (state, message: PayloadAction<SettingsAreas>) => {
      state.settingsCurrentArea = message.payload
    },
    togglePersist: (state, message: PayloadAction<boolean>) => {
      state.menuFields.presistCharacters = message.payload;
    },
    resetCharacterSheet: (state) => {
      state.characterTracker = initialState.characterTracker;
    },
    setTargetFPS: (state, message: PayloadAction<number>) => {
      state.menuFields.targetFPS = message.payload;
    },
    setShowFPS: (state, message: PayloadAction<boolean>) => {
      state.menuFields.showFPS = message.payload;
    },
    setRunLength: (state, message: PayloadAction<number>) => {
      state.menuFields.runLength = message.payload;
    },
    setIsNonStop: (state, message: PayloadAction<boolean>) => {
      state.menuFields.nonStop = message.payload;
    },
    putCharacterToSheetFromRoster: (state, message: PayloadAction<CharacterStats>) => {
      const mended = MendCharacterStats({
        ...message.payload,
        speakingStats: message.payload.speakingStats != undefined ? {...message.payload.speakingStats} : message.payload.speakingStats,
      });
      state.charSheetFields.character = mended;
      state.characterEditor = CharacterEditor.roster
    },
    putCharacterToSheetFromTemplate: (state, message: PayloadAction<CharacterStats>) => {
      const mended = MendCharacterStats({
        ...message.payload,
        speakingStats: message.payload.speakingStats != undefined ? {...message.payload.speakingStats} : message.payload.speakingStats,
      });
      state.charSheetFields.character =  {...mended, currentX: state.charSheetFields.character.currentX, currentY: state.charSheetFields.character.currentY}
      state.characterEditor = CharacterEditor.template
    },
    removeWorkingCharacter: (state) => {
      state.workingChracter = null;
    },
    updateCharSheetType: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.type = message.payload;
    },
    updateCharSheetSubType: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.subType = message.payload;
    },
    updateCharSheetAttribute: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.attributes = [message.payload];
    },
    updateCharSheetOrientation: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.orientation = message.payload;
    },
    updateCharSheetCurrentX: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character = {...state.charSheetFields.character, currentX: message.payload}
    },
    updateCharSheetCurrentY: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character = {...state.charSheetFields.character, currentY: message.payload}
    },
    updateCharSheetXCordThreshold: (state, message: PayloadAction<number>) => {
      state.charSheetFields.xCordThreshold = message.payload;
    },
    updateCharSheetYCordThreshold: (state, message: PayloadAction<number>) => {
      state.charSheetFields.yCordThreshold = message.payload;
    },
    updateCharSheetSpeaking: (state, message: PayloadAction<string>) => {
      if(message.payload.length > 0) {
        if(state.charSheetFields.character.speakingStats.zIndex == undefined) {
          state.charSheetFields.character.speakingStats.zIndex = 0;
        }
        state.charSheetFields.character.attributes = [...state.charSheetFields.character.attributes, CharacterAttribute.speaking];
      } else {
        state.charSheetFields.character.speakingStats.zIndex = 0;
        state.charSheetFields.character.attributes = state.charSheetFields.character.attributes.filter(entry => entry != CharacterAttribute.speaking);
      }

      state.charSheetFields.character.speaking = message.payload;

    },
    updateCharSheetMovementXInterval: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.xInterval = message.payload;
    },
    updateCharSheetMovementYInterval: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.yInterval = message.payload;
    },
    upateCharSheetMovementOne: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.directionOne = message.payload;
    },
    upateCharSheetMovementTwo: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.directionTwo = message.payload;
    },
    updateCharSheetMovementXRate: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.xRate = message.payload;
    },
    updateCharSheetMovementYRate: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.yRate = message.payload;
    },
    updateCharSheetXBound: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.boundingBox.xBound = message.payload;
    },
    updateCharSheetYBound: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.boundingBox.yBound = message.payload;
    },
    updateCharSheetXOrigin: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.boundingBox.xOrigin = message.payload;
    },
    updateCharSheetYOrigin: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.boundingBox.yOrigin = message.payload;
    },
    updateCharSheetBoundingBox: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.movement.boundingBox.shape = message.payload;
    },
    updateCharSheetActive: (state, message: PayloadAction<boolean>) => {
      state.charSheetFields.character.active = message.payload;
    },
    updateCharSheetToRender: (state, message: PayloadAction<boolean>) => {
      state.charSheetFields.character.toRender = message.payload;
    },
    updateCharSheetRotation: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.rotation = message.payload;
    },
    updateCharSheetTimeDelay: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.delay = message.payload;
    },
    updateCharSheetHeight: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.sizes = {...state.charSheetFields.character.sizes, height: message.payload}
    },
    updateCharSheetWidth: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.sizes = {...state.charSheetFields.character.sizes, width: message.payload}
    },
    updateCharSheetZIndex: (state, message: PayloadAction<number>) => {
      state.charSheetFields.character.zIndex =  message.payload
    },
    updateCharSheetDialogWidth: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.width = message.payload
      } else {
         state.charSheetFields.character.speakingStats.width = undefined
      }
    },
    updateCharSheetDialogHeight: (state, message: PayloadAction<number>) => {
        state.charSheetFields.character.speakingStats.height = message.payload
    },
    updateCharSheetDialogMarginRight: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.marginRight = message.payload
      } else {
         state.charSheetFields.character.speakingStats.marginRight = undefined
      }
    },
    updateCharSheetDialogMarginLeft: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.marginLeft = message.payload
      } else {
         state.charSheetFields.character.speakingStats.marginLeft = undefined
      }
    },
    updateCharSheetDialogMarginTop: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.marginTop = message.payload
      } else {
         state.charSheetFields.character.speakingStats.marginTop = undefined
      }
    },
    updateCharSheetDialogMarginBottom: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.marginBottom = message.payload
      } else {
         state.charSheetFields.character.speakingStats.marginBottom = undefined
      }
    },
    updateCharSheetDialogRotation: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.rotation = message.payload
      } else {
         state.charSheetFields.character.speakingStats.rotation = undefined
      }
    },
    updateCharSheetDialogZIndex: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false) {
        state.charSheetFields.character.speakingStats.zIndex = message.payload
      } else {
         state.charSheetFields.character.speakingStats.zIndex = undefined
      }
    },
    updateCharSheetDialogUseWordWrap: (state, message: PayloadAction<boolean>) => {
      state.charSheetFields.character.speakingStats.useWordWrap = message.payload
    },
    updateCharSheetDialogWordWrapLength: (state, message: PayloadAction<number>) => {
      if(isFinite(message.payload) && isNaN(message.payload) == false && Number.isInteger(message.payload) && message.payload > 0) {
        state.charSheetFields.character.speakingStats.wordWrapLength = message.payload
      } else {
         state.charSheetFields.character.speakingStats.wordWrapLength = undefined
      }
    },
    updateCharSheetUprightHighlighter: (state, message: PayloadAction<boolean>) => {
      state.charSheetFields.character.switches.uprightHighlighter = message.payload
    },
    updateCharSheetFieldCharacter: (state, message: PayloadAction<CharacterStats>) => {
      state.charSheetFields.character = message.payload;
    },
    setCurrentRosterUISection: (state, message: PayloadAction<UIBranch>) => {
      state.rosterPage = message.payload;
    },
    setJuggleAnimationBoundingBoxes: (state, message: PayloadAction<boolean>) => {
      state.settingsFields.juggleAnimationBounding = message.payload;
    },
  },
})

// Action creators are generated for each case reducer function
export const { nextFrame, updateToken, clearToken, setPages,
    playAnimation, resumeAnimation, resetAnimation, pauseAnimation, stopAnimation, 
    addCharacterToRoster, removeCharacterFromRoster, updateCharacterWithinRoster,
    bulkAddCharactersToRoster, bulkUpdateCharactersWithinRoster, bulkRemoveCharactersFromRoster,
    openControlPanel, closeControlPanel, openSettingsPanel, closeSettingsPanel, openControllerPanel, closeControllerPanel,
    settingsPanelArea, togglePersist, resetCharacterSheet, setTargetFPS, setShowFPS, setRunLength, setIsNonStop, putCharacterToSheetFromRoster, putCharacterToSheetFromTemplate, 
    removeWorkingCharacter, updateCharSheetType, 
    updateCharSheetSubType, updateCharSheetAttribute, updateCharSheetOrientation, updateCharSheetCurrentX, updateCharSheetCurrentY,
    updateCharSheetSpeaking, updateCharSheetMovementXInterval, updateCharSheetMovementYInterval, upateCharSheetMovementOne, upateCharSheetMovementTwo,
    updateCharSheetMovementXRate, updateCharSheetMovementYRate, updateCharSheetXBound, updateCharSheetYBound, updateCharSheetXOrigin, updateCharSheetYOrigin,
    updateCharSheetBoundingBox, updateCharSheetActive, updateCharSheetToRender, updateCharSheetRotation, updateCharSheetTimeDelay, updateCharSheetHeight, updateCharSheetWidth,
    updateCharSheetZIndex, updateCharSheetDialogWidth, updateCharSheetDialogHeight, updateCharSheetDialogMarginRight, updateCharSheetDialogMarginLeft, updateCharSheetDialogMarginTop,
    updateCharSheetDialogMarginBottom, updateCharSheetDialogRotation, updateCharSheetDialogZIndex, updateCharSheetDialogUseWordWrap, updateCharSheetDialogWordWrapLength, updateCharSheetUprightHighlighter,
    setCurrentRosterUISection, setJuggleAnimationBoundingBoxes
 } = AnimationSlice.actions

export default AnimationSlice.reducer