import Link from 'next/link';
import classes from './header.module.css';
import NavLink from './nav-link';
import AuthNav from './auth-nav';
import MobileMenu from './mobile-menu';
import { site } from '@/lib/site';

export const NAV_LINKS = [
    { href: '/work',   label: 'All Work' },
    { href: '/photos', label: 'Photos' },
    { href: '/videos', label: 'Videos' },
];

export default function Header() {
    return (
        <div className={classes.headerWrap}>
            <header className={classes.header}>
                <Link href="/" className={classes.logo} aria-label={`${site.name} home`}>
                    <span className={classes.logoMark}>EJ</span>
                    <span className={classes.logoText}>Edit</span>
                </Link>

                <nav className={classes.nav} aria-label="Main">
                    <ul>
                        {NAV_LINKS.map((l) => (
                            <li key={l.href}><NavLink href={l.href}>{l.label}</NavLink></li>
                        ))}
                    </ul>
                </nav>

                <div className={classes.authBar}>
                    <AuthNav />
                </div>

                <div className={classes.mobileMenuWrap}>
                    <MobileMenu links={NAV_LINKS} />
                </div>
            </header>
        </div>
    );
}
