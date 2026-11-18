import { Dispatch } from '@reduxjs/toolkit';

import { CharacterStats } from "../state-management/models/CharacterStats";
import { UIBranch } from "../state-management/models/UIBranch";
import { CharacterTracker } from "../state-management/slices/presets/AnimationPreset";
import { nextFrame, updateToken } from "../state-management/slices/AnimationSlice";

export type EngineForwardResult = {
    moveComplete: boolean,
    charStats: CharacterStats[],
}

//check characters about should any no longer be active or rendered
export const EngineUpdate = (charStats: CharacterStats[]) => {
    return charStats;
}

//move characters
export const EngineForward = (charStats: CharacterStats[], interpolation: number): EngineForwardResult => {
    const updatedCharStats = charStats;
    for(let idx: number = 0; idx < charStats.length; idx++) {
        if(charStats[idx].active != false) {
            charStats[idx].currentX += ( (charStats[idx].movement.xInterval * charStats[idx].movement.xRate) * interpolation );
            charStats[idx].currentY += ( (charStats[idx].movement.yInterval * charStats[idx].movement.yRate) * interpolation )
        }
    }
    const animationDone = true;

    return {moveComplete: animationDone, charStats: updatedCharStats};
}

export const EngineProgress = (dispatch: Dispatch, currentPage: UIBranch, currentIdentifier: number, uiBranch: UIBranch, runMargin: number, charTrackers: CharacterTracker[]) => {
    if(currentPage != uiBranch && currentIdentifier != -1) {
        clearInterval(currentIdentifier);
        dispatch(updateToken({token: null, currentPage: undefined}));
    }

    const identifier = setInterval(() => {
        const index: number = charTrackers.findIndex(entry => entry.page == uiBranch)
        const charStats: CharacterStats[] = charTrackers[index].chars;

        const TICKS_PER_SECOND: number = 25;
        const SKIP_TICKS: number = 1000 / TICKS_PER_SECOND;
        const MAX_FRAMESKIP: number = 5;

        let runLength = 0;
        let next_game_tick: DOMHighResTimeStamp = performance.now()
        let loops: number;
        let updatedChars: CharacterStats[];
        loops = 0;
        while(performance.now() > next_game_tick && loops < MAX_FRAMESKIP) {
            updatedChars = EngineUpdate(charStats)

            next_game_tick += SKIP_TICKS;
            loops++;
        }

        const interpolation =  (performance.now() + SKIP_TICKS - next_game_tick) / SKIP_TICKS;
        runLength += interpolation;
        const forwardResult: EngineForwardResult = EngineForward(updatedChars, interpolation);

        if(runLength > runMargin) { // runMargin is adjustable. closer to zero shortens the total time the animations will move for before being auto/stopped
            clearInterval(identifier);
        }

        dispatch(nextFrame({uiBranch: currentPage, charStats: forwardResult.charStats}));
    });
    dispatch(updateToken({token: identifier, currentPage: uiBranch}));
}

export const EngineCycle = (dispatch: Dispatch, currentPage: UIBranch, currentIdentifier: number, uiBranch: UIBranch, runMargin: number, charTrackers: CharacterTracker[]) => {
    if( (currentPage == uiBranch && currentIdentifier == -1) || 
        (currentPage != uiBranch && currentIdentifier != -1) ||
        (currentPage != uiBranch && currentIdentifier == -1) ) {
            EngineProgress(dispatch, currentPage,currentIdentifier, uiBranch, runMargin, charTrackers);
        }
}