import { pageEnabled, siteContent } from "../../content/site-content";
import { routes } from "../../routing/routes.mjs";
import { assetUrl } from "../../utilities/assetUrl";
import { Link } from "react-router";
import './Application.scss';

import NavGuide from "../../components/NavGuide/NavGuide";
import { BuildCharacterElements } from "../../components/Characters/CharacterUtil";
import { UIBranch } from "../../state-management/models/UIBranch";
import { useSelector } from "react-redux";
import { RootState } from "../../state-management/store";

export default function Application() {
    const animation = useSelector((state: RootState) => state.animation);

    const content = siteContent.pages.application;
    return (
        <span data-webblocks-page="application">
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.application)}
            </span>

            <div className="applicationPrivacyNotice">
                {pageEnabled('privacy') && <Link style={{ textDecoration: 'none', color: '#bda79e' }} to={routes.privacy}>{content.privacyLabel}</Link>}
            </div>
            <div className="applicationMassMover">
                <div style={{marginLeft: '-5px'}}>
                    <span style={{marginTop: '-50px', display: 'inline-grid', gridAutoFlow: 'column', gridTemplateColumns: '1fr', rowGap: '10px'}}>
                        <img style={{marginLeft: '-50px', height: '130px', width: '200px', paddingBottom: '30px'}} src={assetUrl(content.image)} alt={content.imageAlt}/>
                    </span>

                    <div style={{marginLeft: '-32px', marginTop: '-30px', cursor: 'default'}}>
                        <span style={{display: 'block', marginTop: '7px', color: '#874401ff'}}>{content.versionLabel} {content.version}</span>
                        <span style={{display: 'block', marginTop: '7px', color: '#fffade'}}>{content.statsLabel}</span>

                        <span style={{display: 'block', marginLeft: '-7px', fontSize: '14px'}}>{content.stats}
                        </span>

                        <span style={{display: 'block', marginTop: '17px', color: '#fffade'}}>{content.highlightsLabel}</span>
                        <span style={{display: 'block', marginLeft: '-7px', fontSize: '14px'}}>{content.highlights}
                        </span>

                        <span style={{display: 'flex', flexDirection: 'column', marginTop: '20px'}}>
                            <span style={{display: 'inline-block'}}>{content.changelogLabel}</span>
                            {content.changelog && <span>{content.changelog}</span>}
                        </span>

                    </div>
                </div>
            </div>
        </span>
    )
}