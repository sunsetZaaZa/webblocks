import styles from './Highlighter.module.scss';

import { useRef } from "react";
import { useSelector } from "react-redux";

import { nanoid } from "nanoid";

import { RootState } from "../../../state-management/store";
import { CharacterStylingSpec } from "../../Characters/CharacterMetadata";

export type HighlighterPropSpec = {
    childern?: React.ReactNode,
    toHighlight: string,
    useKey?: boolean,
    styling?: CharacterStylingSpec,
}

export function Highlighter (prop: HighlighterPropSpec) {
    const characterSheet = useSelector((state: RootState) => state.animation.charSheetFields.character);
    const highlighter = useRef<string>('');

    if(characterSheet?.identifier == prop.toHighlight) {
        highlighter.current = styles.selectionOutline
    } else {
        highlighter.current = ''
    }

    return (
        <span key={prop.useKey ? nanoid() : ''} className={highlighter.current} >
            {prop.childern}
        </span>
    );
}