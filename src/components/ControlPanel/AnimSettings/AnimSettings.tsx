import { assetUrl } from "../../../utilities/assetUrl";
import { closeSettingsPanel, openSettingsPanel } from '../../../state-management/slices/AnimationSlice';
import './AnimSettings.scss'

import { useDispatch } from "react-redux";

export type AnimSettingsProps = {
    showAnimControllerPanel: boolean;
    showAminSettingsPanel: boolean;}

export const AnimSettings = (props: AnimSettingsProps) => {
    const dispatch = useDispatch();

    const handleClick = () => {
        if (props.showAnimControllerPanel == true) {
            return;
        }

        if (props.showAminSettingsPanel) {
            dispatch(closeSettingsPanel());
        } else {
            dispatch(openSettingsPanel());
        }
    };

    return (
        <button className='' onClick={handleClick}>
            <img style={{height: '25px', width: '25px'}} src={assetUrl("controller/subcontrols/wrench.png")}/>
        </button>
    );
}