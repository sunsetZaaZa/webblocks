import { forwardRef, type CSSProperties, type DOMAttributes, type Ref } from 'react';

import { SemanticButton } from '../../Common/SemanticButton/SemanticButton';

import styles from './CharacterImageControl.module.scss';

type SpeakingInteractionHandlers = Pick<DOMAttributes<HTMLElement>,
  'onMouseEnter' | 'onMouseLeave' | 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel'>;

export type CharacterImageControlProps = SpeakingInteractionHandlers & {
  /** Source path for the rendered character art. */
  src: string;
  /** Accessible name used when the character art is interactive. */
  alt: string;
  /** Optional visual styles that should apply to the rendered image. */
  imageStyle?: CSSProperties;
  /** Optional extra class for the rendered image element. */
  imageClassName?: string;
  /** Optional extra class for the interactive button wrapper. */
  buttonClassName?: string;
  /** When provided, the character art becomes an actual button. */
  onClick?: () => void;
};

export const CharacterImageControl = forwardRef<HTMLElement, CharacterImageControlProps>(
  (
    {
      alt,
      buttonClassName,
      imageClassName,
      imageStyle,
      onClick,
      src,
      onMouseEnter,
      onMouseLeave,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
    },
    ref,
  ) => {
    const speakingHandlers = { onMouseEnter, onMouseLeave, onTouchStart, onTouchEnd, onTouchCancel };
    if (!onClick) {
      return (
        <img
          {...speakingHandlers}
          ref={ref as Ref<HTMLImageElement>}
          alt={alt}
          className={[styles.characterImage, imageClassName].filter(Boolean).join(' ')}
          src={src}
          style={imageStyle}
        />
      );
    }

    return (
      <SemanticButton
        {...speakingHandlers}
        ref={ref as Ref<HTMLButtonElement>}
        aria-label={alt}
        className={[styles.characterImageButton, buttonClassName]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
        variant="image"
      >
        <img
          alt=""
          aria-hidden="true"
          className={[styles.characterImage, imageClassName].filter(Boolean).join(' ')}
          src={src}
          style={imageStyle}
        />
      </SemanticButton>
    );
  },
);

CharacterImageControl.displayName = 'CharacterImageControl';
