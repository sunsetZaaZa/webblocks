import NavGuide from "../components/NavGuide/NavGuide";
import './scss/UserPrivacy.scss';

export default function UserPrivacy() {
    return (
        <span>
            <NavGuide></NavGuide>
            <div className="userPrivacyMassMover" style={{cursor: 'default'}}>
                <span style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{display: 'inline-block', fontSize: '22px', marginBottom: '10px'}}>UserPrivacy</span>
                    <span style={{display: 'inline-block', width: '420px'}}>
                        
                    </span>

                </span>
                <br></br>
                <div style={{paddingTop: '10px'}}></div>
            </div>
        </span>
    )
}