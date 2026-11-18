import { CSSProperties } from "react";

import { CharacterStats } from "../../state-management/models/CharacterStats";

const defaultWordWrapLength = 300;

export const getSpeakingBubbleVisibleDisplay = () => 'inline-block';

export const shouldSpeakingBubbleWrap = (character?: CharacterStats) =>
  character?.speakingStats?.useWordWrap ?? true;

export const getSpeakingBubbleWordWrapLength = (character?: CharacterStats) => {
  const wordWrapLength = character?.speakingStats?.wordWrapLength;

  if(wordWrapLength == undefined || Number.isFinite(wordWrapLength) == false || wordWrapLength < 1) {
    return defaultWordWrapLength;
  }

  return Math.floor(wordWrapLength);
};

export const formatSpeakingBubbleText = (text: string | undefined, character?: CharacterStats) => {
  return text ?? character?.speaking ?? '';
};

export const getSpeakingBubbleStyle = (character: CharacterStats | undefined) : CSSProperties => {
  const shouldWrap = shouldSpeakingBubbleWrap(character);
  const width = character?.speakingStats?.width;
  const wordWrapLength = getSpeakingBubbleWordWrapLength(character);
  const widthValue = width != undefined && Number.isFinite(width) && width > 0 ? `${Math.floor(width)}px` : undefined;

  return {
    position: 'absolute',
    fontFamily: 'CorneritaRegular',
    display: 'none',
    width: widthValue ?? (shouldWrap ? 'max-content' : 'max-content'),
    maxWidth: shouldWrap ? `${wordWrapLength}px` : 'none',
    height: character?.speakingStats?.height ?? '50px',
    top: character?.currentY,
    left: (character?.currentX ?? 0) + (character?.sizes?.width ?? 0),
    marginLeft: character?.speakingStats?.marginLeft,
    marginRight: character?.speakingStats?.marginRight,
    marginTop: character?.speakingStats?.marginTop,
    marginBottom: character?.speakingStats?.marginBottom,
    zIndex: character?.speakingStats?.zIndex,
    transform: character?.speakingStats?.rotation != undefined && character?.speakingStats?.rotation != 0 ? `rotate(${character?.speakingStats?.rotation}deg)` : '',
    whiteSpace: shouldWrap ? 'pre-wrap' : 'nowrap',
    overflowWrap: shouldWrap ? 'break-word' : 'normal',
    wordBreak: 'normal',
  };
};
