import { useId, useState } from "react";
import { useDispatch } from "react-redux";

import { SemanticButton } from "../Common/SemanticButton/SemanticButton";
import type { AppDispatch } from "../../state-management/store";
import { UIGenericHotkeyProp } from "./HotkeyUtil";
import styles from "./UISectionHotkey.module.scss";

export const UISectionHotkey = (prop: UIGenericHotkeyProp) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipId = useId();
  const hasHoverText = prop.hoverText !== null && prop.hoverText.length > 0;
  const isDisabled = prop.btnOnClick === undefined;

  const dispatchHotkeyAction = () => {
    if (prop.btnOnClick === undefined) {
      return;
    }

    dispatch(prop.btnOnClick());
  };

  return (
    <SemanticButton
      aria-describedby={hasHoverText ? tooltipId : undefined}
      className={styles.root}
      disabled={isDisabled}
      onBlur={() => setIsTooltipVisible(false)}
      onClick={dispatchHotkeyAction}
      onFocus={() => setIsTooltipVisible(true)}
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
      variant="reset"
    >
      <span className={styles.content}>
        <span className={styles.label}>{prop.buttonText}</span>
        {hasHoverText && (
          <span
            className={`${styles.tooltip} ${
              isTooltipVisible ? styles.tooltipVisible : ""
            }`}
            id={tooltipId}
            style={{ ...prop.hoverElStyle, marginTop: "1rem" }}
          >
            {prop.hoverText}
          </span>
        )}
      </span>
    </SemanticButton>
  );
};
