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
            <button onClick={() => {dispatch(playAnimation())}}> <img style={{height: '21px', width: '21px'}} src="/controller/animation/play.png"/> </button>
            <button onClick={() => {dispatch(pauseAnimation())}}> <img style={{height: '21px', width: '21px'}} src="/controller/animation/pause.png"/> </button>
            <button onClick={() => {dispatch(resetAnimation())}}> <img style={{height: '21px', width: '21px'}} src="/controller/animation/repeat.png"/> </button>
            <button onClick={() => {dispatch(stopAnimation())}}> <img style={{height: '21px', width: '21px'}} src="/controller/animation/stop.png"/> </button>
        </span>
    );
}