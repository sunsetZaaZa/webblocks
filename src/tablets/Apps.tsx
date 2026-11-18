import './scss/Apps.scss';

import { Link } from 'react-router';
import NavGuide from '../components/NavGuide/NavGuide';
import { BuildCharacterElements } from '../components/Characters/CharacterUtil';
import { UIBranch } from '../state-management/models/UIBranch';
import { useSelector } from 'react-redux';
import { RootState } from '../state-management/store';

export default function Apps() {
    const animation = useSelector((state: RootState) => state.animation);

    return (
        <span>
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.apps)}
            </span>
            <div className="mobileAppsMassMover" >                
                <span className="flex-grid">
                    <Link
                        aria-label="app"
                        className="mobileAppIconLink"
                        to="/apps/application"
                    >
                        <img
                            alt="app icon"
                            className="mobileAppIcon"
                            src="/duck.png"
                        />
                    </Link>
                    <span><Link style={{ textDecoration: 'none', color: 'inherit', marginLeft: '37.5px', width: '55' }} to="/apps/app">app name</Link></span>
                    <span style={{display: 'inline', width: '12rem', marginTop: '8px', marginLeft: '1.5rem', cursor: 'default'}}>description</span>
                </span>
                <span style={{display: 'inline-block', width: '20rem', cursor: 'default', color: '#fffade'}}>
                    <li>detail 1</li>
                    <li>detail 2</li>
                    <li>detail 3</li>
                </span>
            </div>
        </span>
    )
}
