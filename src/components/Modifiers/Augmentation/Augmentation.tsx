import type { CSSProperties, ReactNode, Ref } from "react";
import { Property } from "csstype";
import { nanoid } from "nanoid";

import { CharacterStylingSpec } from "../../Characters/CharacterMetadata";

export type AugmentationPropSpec = {
    children?: ReactNode;
    useKey?: boolean,
    styling?: CharacterStylingSpec,
    ref?: Ref<HTMLSpanElement>,
}

export function Augmentation (prop: AugmentationPropSpec) {
    const builtStyling: CSSProperties = {};

    if(prop.styling != undefined) {
        if(prop.styling.currentX != undefined) {
           if(prop.styling.currentX != null && prop.styling.currentX != 0) {
                builtStyling.left = prop.styling.currentX;
            }
        }
        if(prop.styling.currentY != undefined) {
           if(prop.styling.currentY != null && prop.styling.currentY != 0) {
                builtStyling.top = prop.styling.currentY;
            }
        }

        if(prop.styling?.position != undefined && prop.styling?.position != null) {
            builtStyling.position = prop.styling?.position as Property.Position;
        }
        else if((prop.styling?.currentX != undefined && prop.styling?.currentX != null && prop.styling?.currentX != 0) || (prop.styling?.currentY != undefined && prop.styling?.currentY != null && prop.styling?.currentY != 0)) {
            builtStyling.position = 'absolute';
        }

        if(prop.styling?.rotation != undefined && prop.styling?.rotation != null && prop.styling?.rotation != 0) {
            builtStyling.transform = 'rotate(' + prop.styling.rotation + 'deg)';
        }

        if(prop.styling?.zIndex != undefined && prop.styling?.zIndex != null && prop.styling?.zIndex != 0) {
            builtStyling.zIndex = prop.styling.zIndex;
        }
    }

    return (
        <span key={prop.useKey ? nanoid() : ''} ref={prop.ref} style={builtStyling}>
            {prop.children}
        </span>
    );
}