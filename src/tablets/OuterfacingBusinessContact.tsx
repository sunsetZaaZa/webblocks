import { siteContent } from "../content/site-content";
import './scss/OuterfacingBusinessContact.scss';

import type { RootState } from '../state-management/store';
import { useSelector } from 'react-redux';

import NavGuide from "../components/NavGuide/NavGuide";
import { UIBranch } from '../state-management/models/UIBranch';
import { BuildCharacterElements } from '../components/Characters/CharacterUtil';

export default function OuterfacingBusinessContact() {
    const animation = useSelector((state: RootState) => state.animation);

    const content = siteContent.pages.about;
    return (
        <span data-webblocks-page="about">
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.libraries)}
            </span>
            <div className="massMover" style={{cursor: 'default'}}>              
                <div className="contactMover">
                    <span style={{display: 'flex', flexDirection: 'column', alignContent: 'flex-start'}}> 
                        <span style={{fontSize: '16px', color: "grey"}}>{content.key}</span>
                        <span style={{paddingLeft: '10px'}}>{content.value}</span>
                    </span>            
                </div>
                <div className="addressMover">
                    <span style={{display: 'flex', flexDirection: 'column'}}> 
                        {content.address}
                    </span>
                </div>
            </div>
        </span>
    )
}