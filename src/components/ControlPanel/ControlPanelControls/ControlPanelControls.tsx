import './ControlPanelControls.scss'
import { siteConfig } from '../../../config/site'

import { AnimController } from '../AnimController/AnimController';
import { AnimSettings } from '../AnimSettings/AnimSettings';

export type ControlPanelControlsProps = {
    showSelf: boolean;
    showAnimControllerPanel: boolean;
    showAminSettingsPanel: boolean;
}

export const ControlPanelControls = (props: ControlPanelControlsProps) => {
    const displayOption: string = props.showSelf ? 'flex' : 'none';

    return (
        <span style={{display: displayOption, flexDirection: 'row', gap: '5px', zIndex: 100, height: '40px', width: '40px'}}>
            {siteConfig.features.animations && <AnimController showAnimControllerPanel={props.showAnimControllerPanel} showAminSettingsPanel={props.showAminSettingsPanel}></AnimController>}
            <AnimSettings showAminSettingsPanel={props.showAminSettingsPanel} showAnimControllerPanel={props.showAnimControllerPanel}></AnimSettings>
        </span>
    );
}