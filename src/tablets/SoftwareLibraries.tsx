import { pageEnabled, siteContent } from "../content/site-content";
import { routes } from "../routing/routes.mjs";
import { Link } from "react-router";
import './scss/SoftwareLibraries.scss';

import type { RootState } from '../state-management/store';
import { useSelector } from 'react-redux';

import NavGuide from "../components/NavGuide/NavGuide";
import { UIBranch } from '../state-management/models/UIBranch';
import { BuildCharacterElements } from "../components/Characters/CharacterUtil";

export default function SoftwareLibraries() {
    const animation = useSelector((state: RootState) => state.animation);
    
    const content = siteContent.pages.libraries;
    const detail = <span style={{display: 'flex', flexDirection: 'column', flexWrap: 'nowrap'}}>{content.detailLabel}</span>;
    return (
        <span data-webblocks-page="libraries">
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.libraries)}
            </span>
            <div className="mobileAppsMassMover" style={{cursor: 'default'}}>                
                <span style={{display: 'flex', flexDirection: 'column', width: '130px'}}>
                    {pageEnabled('softwarePackage') ? <Link style={{ marginLeft: '40px', fontSize: '20px' }} className='btn_package' to={routes.softwarePackage}>{content.packageLabel}</Link> : <span style={{ marginLeft: '40px', fontSize: '20px' }}>{content.packageLabel}</span>}
                    {pageEnabled('softwarePackage') ? <Link style={{ marginLeft: '40px', fontSize: '20px' }} className='btn_package' to={routes.softwarePackage}>{detail}</Link> : <span style={{ marginLeft: '40px', fontSize: '20px' }}>{detail}</span>}
                </span>
            </div>
        </span>
    )
}