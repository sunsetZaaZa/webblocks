import { assetUrl } from "../../../utilities/assetUrl";
import { useRef } from 'react';
import { pauseAnimation, playAnimation, resetAnimation, stopAnimation } from '../../../state-management/slices/AnimationSlice';
import './ControllerControlPanel.scss'

import { useDispatch } from "react-redux";
import { nanoid } from 'nanoid';

export const ControllerControlPanel = () => {
    const dispatch = useDispatch();
    const keyId = useRef(nanoid());

    return (
        <span key={keyId.current} style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '4px', marginTop: '-45px', marginLeft: '20px'}}>
            <button type="button" aria-label="Play animation" onClick={() => {dispatch(playAnimation())}}> <img alt="" style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/play.png")}/> </button>
            <button type="button" aria-label="Pause animation" onClick={() => {dispatch(pauseAnimation())}}> <img alt="" style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/pause.png")}/> </button>
            <button type="button" aria-label="Reset animation" onClick={() => {dispatch(resetAnimation())}}> <img alt="" style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/repeat.png")}/> </button>
            <button type="button" aria-label="Stop animation" onClick={() => {dispatch(stopAnimation())}}> <img alt="" style={{height: '21px', width: '21px'}} src={assetUrl("controller/animation/stop.png")}/> </button>
        </span>
    );
}