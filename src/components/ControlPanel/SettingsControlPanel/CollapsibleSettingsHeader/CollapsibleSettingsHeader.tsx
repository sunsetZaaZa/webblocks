import { SemanticButton } from '../../../Common/SemanticButton/SemanticButton';

import styles from './CollapsibleSettingsHeader.module.scss';

type CollapsibleSettingsHeaderProps = {
  controlsId: string;
  expanded: boolean;
  title: string;
  onToggle: () => void;
};

export function CollapsibleSettingsHeader({
  controlsId,
  expanded,
  title,
  onToggle,
}: CollapsibleSettingsHeaderProps) {
  return (
    <SemanticButton
      aria-controls={controlsId}
      aria-expanded={expanded}
      className={styles.header}
      onClick={onToggle}
      variant="disclosure"
    >
      <img
        alt=""
        aria-hidden="true"
        className={[styles.arrow, expanded ? styles.arrowExpanded : '']
          .filter(Boolean)
          .join(' ')}
        src="/gen_util/upward_arrow.png"
      />
      <span aria-hidden="true" className={styles.rule} />
      <span className={styles.title}>{title}</span>
      <span aria-hidden="true" className={styles.rule} />
    </SemanticButton>
  );
}
