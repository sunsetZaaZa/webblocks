import { assetUrl } from "../../../utilities/assetUrl";
import { closeControllerPanel, openControllerPanel } from '../../../state-management/slices/AnimationSlice';
import './AnimController.scss'

import { useDispatch } from "react-redux";

export type AnimControllerProps = {
    showAnimControllerPanel: boolean;
    showAminSettingsPanel: boolean;
}

export const AnimController = (props: AnimControllerProps) => {
    const dispatch = useDispatch();

    const handleClick = () => {
        if (props.showAminSettingsPanel == true) {
            return;
        }

        if (props.showAnimControllerPanel) {
            dispatch(closeControllerPanel());
        } else {
            dispatch(openControllerPanel());
        }
    };

    return (
        <button className='' onClick={handleClick}>
            <img style={{height: '25px', width: '25px'}} src={assetUrl("controller/subcontrols/game_controller.png")}/>
        </button>
    );
}