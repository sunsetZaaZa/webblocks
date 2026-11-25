import { assetUrl } from "../../../utilities/assetUrl";
import { useMemo, useRef } from "react";

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
    const speakingBubble = useRef<HTMLSpanElement>(null);

    const isSpeaking = useMemo(() => prop.info.attributes?.findIndex(entry => entry == CharacterAttribute.speaking) > -1 ? true : false, [prop.info.attributes])
    const outputSpeaking = prop.info.switches?.outputSpeaking ?? false;

    // Resolve the current DOM node at event time. A character may rerender or
    // replace its image control while the speaking settings remain unchanged.
    const showSpeakingBubble = () => {
        if (isSpeaking && outputSpeaking && speakingBubble.current) {
            speakingBubble.current.style.display = getSpeakingBubbleVisibleDisplay();
        }
    };

    const hideSpeakingBubble = () => {
        if (speakingBubble.current) speakingBubble.current.style.display = 'none';
    };

    srcImage = useMemo(() => { 
        if(prop.info.orientation == NaturalOrientation.neutral) {
            return assetUrl("characters/crunch_norm_right_web.png");
        }
    }, [prop.info.orientation])

    const autoGen = [];
    autoGen.push(
        <Augmentation key={prop.useKey ? nanoid() : ''} styling={{currentX: prop.info?.currentX, currentY: prop.info?.currentY, rotation: prop.info?.switches?.uprightHighlighter == false ? prop.info?.rotation : 0, zIndex: prop.info?.zIndex, position: prop.styling?.position}}>
            <SelectionHighlight movingTarget={selectedCharacter} toHighlight={prop.info?.identifier} actuallyUse={prop.info?.switches?.useHighlighter}>
                <CharacterImageControl
                    onMouseEnter={showSpeakingBubble}
                    onMouseLeave={hideSpeakingBubble}
                    onTouchStart={showSpeakingBubble}
                    onTouchEnd={hideSpeakingBubble}
                    onTouchCancel={hideSpeakingBubble}
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
            <span key="speaking-bubble" style={getSpeakingBubbleStyle(prop.info)} ref={speakingBubble}>
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