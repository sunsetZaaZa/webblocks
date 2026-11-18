import './NavGuide.scss';

//import { useDispatch, useSelector } from 'react-redux';

import { Link } from 'react-router';
//import { RootState } from '../../state-management/store';

//import { UIBranch } from '../../state-management/models/UIBranch';
//import { EngineCycle } from '../../animation/AnimEngine';
//import { CharacterTracker } from '../../state-management/slices/presets/AnimationPreset';

export default function NavGuide() {
    //let animationRig = useSelector((state: RootState) => state.animation);
    //let charTrackers: CharacterTracker[] = useSelector((state: RootState) => state.animation.characterTracker);

    //const dispatch = useDispatch();

    return (
        <ul className="navGuideMover">
            <li className="NavTopic">
                <Link onClick={() => { }} style={{ fontFamily: 'ShareTech', textDecoration: 'none', color: 'inherit', fontSize: '18px', marginLeft: '-6px' }} to="/">homepage</Link>
            </li>
            <li className="NavEntry">
                <Link onClick={() => { }} style={{ textDecoration: 'none', color: 'inherit' }} to="/apps">apps</Link>
                </li>
            <li className="NavEntry">
                <Link onClick={() => { }} style={{ textDecoration: 'none', color: 'inherit' }} to="/software_libaries">software libaries</Link>
            </li>
            <li className="NavEntry">
                <Link onClick={() => {  }} style={{ textDecoration: 'none', color: 'inherit' }} to="/userprivacy">user privacy</Link>
            </li>
        </ul>
    )
}