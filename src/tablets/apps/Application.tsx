import { Link } from "react-router";
import './Application.scss';

import NavGuide from "../../components/NavGuide/NavGuide";
import { BuildCharacterElements } from "../../components/Characters/CharacterUtil";
import { UIBranch } from "../../state-management/models/UIBranch";
import { useSelector } from "react-redux";
import { RootState } from "../../state-management/store";

export default function Application() {
    const animation = useSelector((state: RootState) => state.animation);

    return (
        <span>
            <NavGuide></NavGuide>
            <span style={{position: 'absolute'}}>
                {BuildCharacterElements(animation.characterTracker, UIBranch.application)}
            </span>

            <div className="applicationPrivacyNotice">
                <Link style={{ textDecoration: 'none', color: '#bda79e' }} to='/user_privacy'>User Privacy</Link>
            </div>
            <div className="applicationMassMover">
                <div style={{marginLeft: '-5px'}}>
                    <span style={{marginTop: '-50px', display: 'inline-grid', gridAutoFlow: 'column', gridTemplateColumns: '1fr', rowGap: '10px'}}>
                        <img style={{marginLeft: '-50px', height: '130px', width: '200px', paddingBottom: '30px'}} src="/duck.png"/>
                    </span>

                    <div style={{marginLeft: '-32px', marginTop: '-30px', cursor: 'default'}}>
                        <span style={{display: 'block', marginTop: '7px', color: '#874401ff'}}>Current Version: 0.0.0</span>
                        <span style={{display: 'block', marginTop: '7px', color: '#fffade'}}>Stats</span>

                        <span style={{display: 'block', marginLeft: '-7px', fontSize: '14px'}}>

                        </span>

                        <span style={{display: 'block', marginTop: '17px', color: '#fffade'}}>Highlights</span>
                        <span style={{display: 'block', marginLeft: '-7px', fontSize: '14px'}}>

                        </span>

                        <span style={{display: 'flex', flexDirection: 'column', marginTop: '20px'}}>
                            <span style={{display: 'inline-block'}}>Changelog</span>

                        </span>

                    </div>
                </div>
            </div>
        </span>
    )
}