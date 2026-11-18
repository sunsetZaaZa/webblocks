import type { CSSProperties } from "react";

import { UIBranch } from "../../state-management/models/UIBranch";
import { HotkeyCarouselProp } from "../HotkeyCarousel/HotkeyCarousel";

export type UIHotkeyProp = {
    hoverText: string | null;
    hoverElStyle: CSSProperties;
}

export type UIGenericHotkeyProp = {
    buttonText: string;
    hoverText: string | null;
    uiBranch?: UIBranch;
    hoverElStyle: CSSProperties;
    btnOnClick?: () => { type: string };
}

export const hotkeyBtns: HotkeyCarouselProp = {
    btns: [
        {buttonText: 'Homepage', hoverText:'', uiBranch: UIBranch.homepage, hoverElStyle: {}},
        {buttonText: 'Apps', hoverText:'',uiBranch: UIBranch.apps, hoverElStyle: {}},
        {buttonText: 'Libraries', hoverText:'', uiBranch: UIBranch.libraries, hoverElStyle: {}},
        {buttonText: 'Contact', hoverText:'', uiBranch: UIBranch.contact, hoverElStyle: {}},
    ],
    viewSize: 2,
    mapping: new Map([
        [UIBranch.homepage, [{uiSection: UIBranch.homepage, text: 'Homepage'}]],
        [UIBranch.apps, [{uiSection: UIBranch.apps, text: 'Apps'}, {uiSection: UIBranch.application, text: 'Application'}]],
        [UIBranch.libraries, [{uiSection: UIBranch.libraries, text: 'Libraries'}, {uiSection: UIBranch.softwarepackage, text: 'Software Package'}]],
        [UIBranch.contact, [{uiSection: UIBranch.contact, text: 'Contact'}]]
    ])
}