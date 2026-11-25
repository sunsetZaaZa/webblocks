import { pageEnabled, siteContent } from "../content/site-content";
import { routes } from "../routing/routes.mjs";
import { assetUrl } from "../utilities/assetUrl";
import './scss/Apps.scss';

import { Link } from 'react-router';
import NavGuide from '../components/NavGuide/NavGuide';
import { BuildCharacterElements } from '../components/Characters/CharacterUtil';
import { UIBranch } from '../state-management/models/UIBranch';
import { useSelector } from 'react-redux';
import { RootState } from '../state-management/store';

export default function Apps() {
    const animation = useSelector((state: RootState) => state.animation);

    const content = siteContent.pages.apps;
    const icon = <img alt={content.iconAlt} className="mobileAppIcon" src={assetUrl(content.icon)} />;
    return (
        <span data-webblocks-page="apps">
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.apps)}
            </span>
            <div className="mobileAppsMassMover" >                
                <span className="flex-grid">
                    {pageEnabled('application') ? <Link aria-label={content.linkLabel} className="mobileAppIconLink" to={routes.application}>{icon}</Link> : <span className="mobileAppIconLink">{icon}</span>}
                    <span>{pageEnabled('application') ? <Link style={{ textDecoration: 'none', color: 'inherit', marginLeft: '37.5px', width: '55' }} to={routes.application}>{content.name}</Link> : <span style={{ marginLeft: '37.5px' }}>{content.name}</span>}</span>
                    <span style={{display: 'inline', width: '12rem', marginTop: '8px', marginLeft: '1.5rem', cursor: 'default'}}>{content.description}</span>
                </span>
                <span style={{display: 'inline-block', width: '20rem', cursor: 'default', color: '#fffade'}}>
                    {content.details.map((detail, index) => <li key={index}>{detail}</li>)}
                </span>
            </div>
        </span>
    )
}
