import './ContralPanelToggle.scss'

import { useDispatch } from "react-redux";
import { useRef } from 'react';
import { nanoid } from 'nanoid';
import { closeControlPanel, openControlPanel } from '../../../state-management/slices/AnimationSlice';

export type ControlPanelProps = {
    showOpen: boolean;
}

export const ControlPanelToggle = (props: ControlPanelProps) => {
    const dispatch = useDispatch();
    const keyId = useRef(nanoid());
    
    if(props.showOpen) {
        return (
            <span key={keyId.current} className="controlsBoxBorderOpen">
                <button className='controlsBoxInner' onClick={() => { dispatch(closeControlPanel()); }}>Editor Panel</button>
            </span>
        );
    } else {
        return (
            <span key={keyId.current} className="controlsBoxBorderClosed">
                <button className='controlsBoxInner' onClick={() => { dispatch(openControlPanel()); } }>Editor Panel</button>
            </span>
        );
    }
}
