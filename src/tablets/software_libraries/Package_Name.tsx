import { siteContent } from "../../content/site-content";
import './Package_Name.scss';

import type { RootState } from '../../state-management/store';
import { useSelector } from 'react-redux';

import NavGuide from "../../components/NavGuide/NavGuide";
import { UIBranch } from '../../state-management/models/UIBranch';
import { BuildCharacterElements } from '../../components/Characters/CharacterUtil';

export default function Package_Name() {
    const charStats = useSelector((state: RootState) => state.animation);

    let autoGen = [];
    autoGen = BuildCharacterElements(charStats.characterTracker, UIBranch.softwarepackage);

    const content = siteContent.pages.softwarePackage;
    return (
        <span data-webblocks-page="softwarePackage">
            <NavGuide></NavGuide>
             <span style={{position: 'absolute'}}>
                {autoGen}
            </span>
            <span style={{display: 'inline-block', marginTop: '50px', marginLeft: '200px', cursor: 'default'}}> 
                <span style={{display: 'inline-block', marginTop: '20px', marginLeft: '40px', marginBottom: '7px', fontSize: '18px'}}>{content.heading}</span>

                <span style={{display: 'flex', flexDirection: 'row'}}>
                    <span style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={{display: 'flex', flexDirection: 'column', backgroundColor: 'black', padding: '7px 10px 12px 20px', borderRadius: '25px', minWidth: '400px', maxWidth: '600px'}}>
                            {content.section1}
                        </span>

                        <span style={{display: 'flex', flexDirection: 'column', marginTop: '20px', marginBottom: '20px', backgroundColor: 'black', padding: '7px 10px 7px 20px', borderRadius: '25px', minWidth: '400px', maxWidth: '600px'}}>
                            {content.section2}
                        </span>

                        <span style={{display: 'flex', flexDirection: 'column', marginBottom: '20px', backgroundColor: 'black', padding: '7px 10px 7px 20px', borderRadius: '25px', minWidth: '400px', maxWidth: '600px'}}>
                            {content.section3}
                        </span>
                    </span>

                    <span style={{display: 'flex', flexDirection: 'column', marginLeft: '7px', backgroundColor: 'black', padding: '7px 10px 7px 20px', borderRadius: '25px', width:'180px', height: '120px'}}>
                        {content.partition}
                    </span>
                </span>
            </span>
        </span>
    )
}