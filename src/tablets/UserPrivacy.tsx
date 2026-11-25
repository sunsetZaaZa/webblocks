import { siteContent } from "../content/site-content";
import NavGuide from "../components/NavGuide/NavGuide";
import './scss/UserPrivacy.scss';

export default function UserPrivacy() {
    const content = siteContent.pages.privacy;
    return (
        <span data-webblocks-page="privacy">
            <NavGuide></NavGuide>
            <div className="userPrivacyMassMover" style={{cursor: 'default'}}>
                <span style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{display: 'inline-block', fontSize: '22px', marginBottom: '10px'}}>{content.heading}</span>
                    <span style={{display: 'inline-block', width: '420px'}}>{content.body}
                    </span>

                </span>
                <br></br>
                <div style={{paddingTop: '10px'}}></div>
            </div>
        </span>
    )
}