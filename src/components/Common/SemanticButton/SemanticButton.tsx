import { forwardRef, type ButtonHTMLAttributes } from 'react';

import styles from './SemanticButton.module.scss';

export type SemanticButtonVariant =
  | 'reset'
  | 'inline'
  | 'action'
  | 'disclosure'
  | 'image';

export type SemanticButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * Selects the smallest reusable layout style for the semantic control.
   * Keep visuals in the calling component's existing className when migrating.
   */
  variant?: SemanticButtonVariant;
};

export const SemanticButton = forwardRef<HTMLButtonElement, SemanticButtonProps>(
  ({ className, type = 'button', variant = 'reset', ...buttonProps }, ref) => {
    const semanticClassName = [
      styles.semanticButton,
      styles[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        {...buttonProps}
        ref={ref}
        className={semanticClassName}
        type={type}
      />
    );
  },
);

SemanticButton.displayName = 'SemanticButton';
