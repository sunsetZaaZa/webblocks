import { type CSSProperties, type ReactNode, useId } from "react";
import { nanoid } from "nanoid";

import { SemanticButton } from "../../Common/SemanticButton/SemanticButton";
import { Augmentation } from "../Augmentation/Augmentation";
import { CharacterStylingSpec } from "../../Characters/CharacterMetadata";
import styles from "./Tooltip.module.scss";

export type TooltipPropSpec = {
    useKey?: boolean,
    styling?: CharacterStylingSpec,
    children?: ReactNode,
    childern?: ReactNode,
    toolTip: string,
    toolTipSytling?: CharacterStylingSpec,
    toolTipOnClick?: () => void,
}

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

export const Tooltip = (prop: TooltipPropSpec) => {
    const tooltipId = useId();
    const tooltipStyle = buildTooltipStyle(prop.toolTipSytling);
    const children = prop.children ?? prop.childern;

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
            style={{ zIndex: prop.styling?.zIndex }}
        >
            <Augmentation styling={{
                currentX: prop.styling?.currentX ?? null,
                currentY: prop.styling?.currentY ?? null,
                rotation: prop.styling?.rotation ?? null,
            }}>
                <span style={prop.styling != null ? prop.styling as CSSProperties : {}}>
                    {children}
                </span>
            </Augmentation>
            {tooltipContent}
        </span>
    );
}
