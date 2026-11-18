import './scss/OuterfacingBusinessContact.scss';

import type { RootState } from '../state-management/store';
import { useSelector } from 'react-redux';

import NavGuide from "../components/NavGuide/NavGuide";
import { UIBranch } from '../state-management/models/UIBranch';
import { BuildCharacterElements } from '../components/Characters/CharacterUtil';

export default function OuterfacingBusinessContact() {
    const animation = useSelector((state: RootState) => state.animation);

    return (
        <span>
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.libraries)}
            </span>
            <div className="massMover" style={{cursor: 'default'}}>              
                <div className="contactMover">
                    <span style={{display: 'flex', flexDirection: 'column', alignContent: 'flex-start'}}> 
                        <span style={{fontSize: '16px', color: "grey"}}>Template Key</span>
                        <span style={{paddingLeft: '10px'}}>Template Value</span> 
                    </span>            
                </div>
                <div className="addressMover">
                    <span style={{display: 'flex', flexDirection: 'column'}}> 
                        Template Space
                    </span>
                </div>
            </div>
        </span>
    )
}