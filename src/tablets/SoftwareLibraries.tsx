import { Link } from "react-router";
import './scss/SoftwareLibraries.scss';

import type { RootState } from '../state-management/store';
import { useSelector } from 'react-redux';

import NavGuide from "../components/NavGuide/NavGuide";
import { UIBranch } from '../state-management/models/UIBranch';
import { BuildCharacterElements } from "../components/Characters/CharacterUtil";

export default function SoftwareLibraries() {
    const animation = useSelector((state: RootState) => state.animation);
    
    return (
        <span>
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.libraries)}
            </span>
            <div className="mobileAppsMassMover" style={{cursor: 'default'}}>                
                <span style={{display: 'flex', flexDirection: 'column', width: '130px'}}>
                    <Link style={{ marginLeft: '40px', fontSize: '20px' }} className='btn_package' to="/software_libraries/package">package</Link>
                    <Link style={{ marginLeft: '40px', fontSize: '20px' }} className='btn_package' to="/software_libraries/package"> 
                        <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>
                            Uses Router Link
                        </span>                     
                    </Link>
                </span>
            </div>
        </span>
    )
}