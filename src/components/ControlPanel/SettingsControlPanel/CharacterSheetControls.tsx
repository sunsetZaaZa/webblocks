import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../../state-management/store";
import { UIBranch } from "../../../state-management/models/UIBranch";
import {
  addCharacterToRoster,
  removeCharacterFromRoster,
  updateCharacterWithinRoster,
} from "../../../state-management/slices/AnimationSlice";
import { CharacterEditor } from "../../../state-management/slices/SliceStateSpecs";
import { SemanticButton } from "../../Common/SemanticButton/SemanticButton";
import { selectableCharacters } from "../Subcomponents/TemplateSpawnerPresets";

import styles from "./CharacterSheetControls.module.scss";

export type CharacterSheetControlsProp = {
  selectedUIBranch: UIBranch;
};

export const CharacterSheetControls = (prop: CharacterSheetControlsProp) => {
  const dispatch = useDispatch();
  const animation = useSelector((state: RootState) => state.animation);
  const activeCharacterEditor = animation.characterEditor;
  const charSheetFields = animation.charSheetFields;
  const character = charSheetFields.character;

  if (activeCharacterEditor === CharacterEditor.template) {
    const selectedTemplateExists =
      selectableCharacters.findIndex(
        (entry) => entry.character.identifier === character.identifier
      ) > -1;

    return (
      <SemanticButton
        className={`
          ${styles.addToRosterButton}
          ${
            selectedTemplateExists
              ? styles.addToRosterButtonActive
              : styles.addToRosterButtonInactive
          }
        `}
        onClick={() => {
          dispatch(
            addCharacterToRoster({
              uiBranch: prop.selectedUIBranch,
              charStat: character,
            })
          );
        }}
        variant="action"
      >
        Add to Roster
      </SemanticButton>
    );
  }

  if (activeCharacterEditor === CharacterEditor.roster) {
    return (
      <span className={styles.rosterActionGroup}>
        <SemanticButton
          className={styles.rosterActionButton}
          onClick={() => {
            dispatch(
              updateCharacterWithinRoster({
                uiBranch: prop.selectedUIBranch,
                charStat: character,
              })
            );
          }}
          variant="action"
        >
          Save to Roster
        </SemanticButton>

        <SemanticButton
          className={styles.rosterActionButton}
          onClick={() => {
            dispatch(
              removeCharacterFromRoster({
                uiBranch: prop.selectedUIBranch,
                identifier: character.identifier,
              })
            );
          }}
          variant="action"
        >
          Remove from Roster
        </SemanticButton>
      </span>
    );
  }

  return null;
};
