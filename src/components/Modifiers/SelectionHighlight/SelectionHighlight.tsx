import styles from './SelectionHlghtlight.module.scss';

import { CSSProperties, useRef } from "react";

import { nanoid } from "nanoid";

import { CharacterStylingSpec } from "../../Characters/CharacterMetadata";

export type SelectionHighlightPropSpec = {
    movingTarget: string,
    toHighlight: string,
    useKey?: boolean,
    styling?: CharacterStylingSpec,
    children?: React.ReactNode;
    actuallyUse?: boolean,
}

export function SelectionHighlight (prop: SelectionHighlightPropSpec) {
    const highlighter = useRef<string>(nanoid());

    return (
        <span key={prop?.useKey === true ? highlighter.current : ''} style={prop.styling as CSSProperties} className={prop.movingTarget == prop.toHighlight && prop.actuallyUse === true ? styles.selectionOutline : ''}>
            {prop.children}
        </span>
    );
}