import { forwardRef, type CSSProperties, type Ref } from 'react';

import { SemanticButton } from '../../Common/SemanticButton/SemanticButton';

import styles from './CharacterImageControl.module.scss';

export type CharacterImageControlProps = {
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
    },
    ref,
  ) => {
    if (!onClick) {
      return (
        <img
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
