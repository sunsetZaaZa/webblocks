import { useEffect, useMemo, useRef } from "react";

import { nanoid } from "nanoid";

import { Augmentation } from "../../Modifiers/Augmentation/Augmentation";
import { CharacterAttribute, CharacterPropSpec, NaturalOrientation } from "../CharacterMetadata";
import { SelectionHighlight } from "../../Modifiers/SelectionHighlight/SelectionHighlight";
import { CharacterImageControl } from "../CharacterImageControl/CharacterImageControl";
import { useSelector } from "react-redux";
import { RootState } from "../../../state-management/store";
import { formatSpeakingBubbleText, getSpeakingBubbleStyle, getSpeakingBubbleVisibleDisplay } from "../SpeakingBubbleUtil";


export const Crunch = (prop: CharacterPropSpec) => {
    const selectedCharacter: string = useSelector((state: RootState) => state.animation.charSheetFields.character.identifier);

    let srcImage = '';
    const outerTooltip = useRef<HTMLElement>(null);
    const innterTooltip = useRef<HTMLSpanElement>(null);

    const isSpeaking = useMemo(() => prop.info.attributes?.findIndex(entry => entry == CharacterAttribute.speaking) > -1 ? true : false, [prop.info.attributes])
    const outputSpeaking = prop.info.switches?.outputSpeaking ?? false;

    useEffect(() => {
        const outer = outerTooltip.current;
        const inner = innterTooltip.current;

        if (!isSpeaking || !outputSpeaking || !outer || !inner) {
            return;
        }

        const showSpeakingBubble = () => {
            inner.style.display = getSpeakingBubbleVisibleDisplay();
        };

        const hideSpeakingBubble = () => {
            inner.style.display = 'none';
        };

        outer.addEventListener('mouseenter', showSpeakingBubble);
        outer.addEventListener('touchstart', showSpeakingBubble);
        outer.addEventListener('mouseleave', hideSpeakingBubble);
        outer.addEventListener('touchend', hideSpeakingBubble);

        return () => {
            outer.removeEventListener('mouseenter', showSpeakingBubble);
            outer.removeEventListener('touchstart', showSpeakingBubble);
            outer.removeEventListener('mouseleave', hideSpeakingBubble);
            outer.removeEventListener('touchend', hideSpeakingBubble);
        };
    }, [isSpeaking, outputSpeaking]);

    srcImage = useMemo(() => { 
        if(prop.info.orientation == NaturalOrientation.neutral) {
            return "/characters/crunch_norm_right_web.png";
        }
    }, [prop.info.orientation])

    const autoGen = [];
    autoGen.push(
        <Augmentation key={prop.useKey ? nanoid() : ''} styling={{currentX: prop.info?.currentX, currentY: prop.info?.currentY, rotation: prop.info?.switches?.uprightHighlighter == false ? prop.info?.rotation : 0, zIndex: prop.info?.zIndex, position: prop.styling?.position}}>
            <SelectionHighlight movingTarget={selectedCharacter} toHighlight={prop.info?.identifier} actuallyUse={prop.info?.switches?.useHighlighter}>
                <CharacterImageControl
                    ref={outerTooltip}
                    alt="Crunch character"
                    src={srcImage}
                    imageStyle={{height: prop.info.sizes != undefined && prop.info.sizes != null ? prop.info.sizes.height + 'px' : '48px',
                     width: prop.info.sizes != undefined && prop.info.sizes != null ? prop.info.sizes.width + 'px' : '48px',
                     transform: prop.info?.switches?.uprightHighlighter == true && prop.info?.rotation != undefined ? 'rotate(' + prop.info.rotation + 'deg)' : ''}}
                    onClick={prop.onClick}
                />
            </SelectionHighlight>
        </Augmentation>
    );

    if(isSpeaking && outputSpeaking) {
        autoGen.push(
            <span key={nanoid()} style={getSpeakingBubbleStyle(prop.info)} ref={innterTooltip}>
                {formatSpeakingBubbleText(prop.info.speaking, prop.info)}
            </span>
        );
    }

    return(
        <span style={{marginLeft: prop.styling?.marginLeft ?? '', marginRight: prop.styling?.marginRight ?? ''}}>
            {autoGen}
        </span>
    );
};