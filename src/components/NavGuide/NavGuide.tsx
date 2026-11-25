import { routes } from "../../routing/routes.mjs";
import { siteContent } from "../../content/site-content";
import './NavGuide.scss';
import { Link } from 'react-router';

export default function NavGuide() {
    return (
        <ul className="navGuideMover">
            {siteContent.navigation.map(({page, label}) => page === 'home' ? (
                <li key={page} className="NavTopic">
                    <Link style={{ fontFamily: 'ShareTech', textDecoration: 'none', color: 'inherit', fontSize: '18px', marginLeft: '-6px' }} to={routes[page]}>{label}</Link>
                </li>
            ) : (
                <li key={page} className="NavEntry">
                    <Link style={{ textDecoration: 'none', color: 'inherit' }} to={routes[page]}>{label}</Link>
                </li>
            ))}
        </ul>
    )
}
