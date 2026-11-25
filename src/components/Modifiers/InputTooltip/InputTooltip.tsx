import { type CSSProperties, type ReactNode, useId } from "react";
import { nanoid } from "nanoid";

import { SemanticButton } from "../../Common/SemanticButton/SemanticButton";
import { Augmentation } from "../Augmentation/Augmentation";
import { CharacterStylingSpec } from "../../Characters/CharacterMetadata";
import styles from "./InputTooltip.module.scss";

export type InputTooltipPropSpec = {
    useKey?: boolean,
    styling?: CharacterStylingSpec,
    children?: ReactNode,
    toolTip: string,
    toolTipSytling?: CharacterStylingSpec,
    toolTipOnClick?: () => void,
}

const buildOuterStyle = (styling?: CharacterStylingSpec): CSSProperties => ({
    marginLeft: styling?.marginLeft,
    marginRight: styling?.marginRight,
    marginTop: styling?.marginTop,
    marginBottom: styling?.marginBottom,
});

const buildTooltipStyle = (styling?: CharacterStylingSpec): CSSProperties => ({
    width: styling?.width ?? "auto",
    height: styling?.height ?? "auto",
    top: styling?.currentY,
    left: styling?.currentX,
    marginLeft: styling?.marginLeft,
    marginRight: styling?.marginRight,
    marginTop: styling?.marginTop,
    marginBottom: styling?.marginBottom,
    zIndex: styling?.zIndex,
    rotate: styling?.rotation !== undefined ? `${styling.rotation.toString(10)}deg` : "0deg",
});

export const InputTooltip = (prop: InputTooltipPropSpec) => {
    const tooltipId = useId();
    const tooltipStyle = buildTooltipStyle(prop.toolTipSytling);

    const tooltipContent = prop.toolTipOnClick ? (
        <SemanticButton
            aria-label={prop.toolTip}
            className={`${styles.tooltipContent} ${styles.tooltipAction}`}
            onClick={prop.toolTipOnClick}
            style={tooltipStyle}
            type="button"
            variant="inline"
        >
            {prop.toolTip}
        </SemanticButton>
    ) : (
        <span
            className={styles.tooltipContent}
            id={tooltipId}
            role="tooltip"
            style={tooltipStyle}
        >
            {prop.toolTip}
        </span>
    );

    return (
        <span
            aria-describedby={prop.toolTipOnClick ? undefined : tooltipId}
            className={styles.tooltipRoot}
            key={prop.useKey ? nanoid() : undefined}
            style={buildOuterStyle(prop.styling)}
        >
            <Augmentation styling={{
                currentX: prop.styling?.currentX,
                currentY: prop.styling?.currentY,
                rotation: prop.styling?.rotation,
                zIndex: prop.styling?.zIndex,
            }}>
                {prop.children}
            </Augmentation>
            {tooltipContent}
        </span>
    );
}
