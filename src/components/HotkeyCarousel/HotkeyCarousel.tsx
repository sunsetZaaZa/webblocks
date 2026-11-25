import { assetUrl } from "../../utilities/assetUrl";
import { useCallback, useMemo, useState } from "react";
import { UISectionHotkey } from "../UISectionHotkeys/UISectionHotkey";
import { SemanticButton } from "../Common/SemanticButton/SemanticButton";
import { UIGenericHotkeyProp } from "../UISectionHotkeys/HotkeyUtil";
import { UIBranch } from "../../state-management/models/UIBranch";
import { UIBranchGlyph } from "./HotkeyCarouselUtil";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../state-management/store";
import { setCurrentRosterUISection } from "../../state-management/slices/AnimationSlice";
import styles from "./HotkeyCarousel.module.scss";

export type HotkeyCarouselProp = {
  btns: UIGenericHotkeyProp[];
  viewSize: number;
  mapping: Map<UIBranch, UIBranchGlyph[]>;
};

export const HotkeyCarousel = (prop: HotkeyCarouselProp) => {
  const dispatch = useDispatch();
  const [viewIndex, setViewIndex] = useState(0);

  const rosterPage = useSelector(
    (state: RootState) => state.animation.rosterPage
  );

  const maxIndex = Math.max(prop.btns.length - prop.viewSize, 0);

  const visibleButtons = useMemo(() => {
    return prop.btns.slice(viewIndex, viewIndex + prop.viewSize);
  }, [prop.btns, prop.viewSize, viewIndex]);

  const sectionOptions = useMemo(() => {
    const directMatch = prop.mapping.get(rosterPage);

    if (directMatch) {
      return directMatch;
    }

    for (const entries of prop.mapping.values()) {
      const containsCurrentPage = entries.some(
        (entry) => entry.uiSection === rosterPage
      );

      if (containsCurrentPage) {
        return entries;
      }
    }

    return [];
  }, [prop.mapping, rosterPage]);

  const moveNext = useCallback(() => {
    setViewIndex((currentIndex) =>
      Math.min(currentIndex + prop.viewSize, maxIndex)
    );
  }, [prop.viewSize, maxIndex]);

  const moveBack = useCallback(() => {
    setViewIndex((currentIndex) =>
      Math.max(currentIndex - prop.viewSize, 0)
    );
  }, [prop.viewSize]);

  return (
    <span className={styles.root}>
      <span className={styles.buttonRow}>
        <SemanticButton
          aria-label="Previous hotkey group"
          className={styles.arrowButton}
          onClick={moveBack}
          variant="image"
        >
          <img
            alt=""
            className={styles.arrowIcon}
            src={assetUrl("gen_util/left_arrow.png")}
          />
        </SemanticButton>

        <span className={styles.buttonTrack}>
          {visibleButtons.map((btn) => (
            <UISectionHotkey
              key={btn.uiBranch ?? btn.buttonText}
              buttonText={btn.buttonText}
              hoverText={btn.hoverText}
              hoverElStyle={btn.hoverElStyle}
              btnOnClick={() =>
                setCurrentRosterUISection(btn.uiBranch as UIBranch)
              }
            />
          ))}
        </span>

        <SemanticButton
          aria-label="Next hotkey group"
          className={styles.arrowButton}
          onClick={moveNext}
          variant="image"
        >
          <img
            alt=""
            className={`${styles.arrowIcon} ${styles.arrowIconNext}`}
            src={assetUrl("gen_util/left_arrow.png")}
          />
        </SemanticButton>
      </span>

      <select
        className={styles.sectionSelect}
        value={rosterPage}
        onChange={(event) => {
          dispatch(
            setCurrentRosterUISection(Number(event.target.value) as UIBranch)
          );
        }}
      >
        {sectionOptions.map((entry) => (
          <option key={entry.uiSection} value={entry.uiSection}>
            {entry.text}
          </option>
        ))}
      </select>
    </span>
  );
};