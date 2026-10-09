import Link from 'next/link';
import Image from 'next/image';
import classes from './header.module.css';
import NavLink from './nav-link';
import AuthNav from './auth-nav';
import MobileMenu from './mobile-menu';
import { site, LOGO_SRC } from '@/lib/site';

export const NAV_LINKS = [
    { href: '/work',   label: 'All Work' },
    { href: '/photos', label: 'Photos' },
    { href: '/videos', label: 'Videos' },
];

export default function Header() {
    return (
        <div className={classes.headerWrap}>
            <header className={classes.header}>
                <Link href="/" className={classes.logo} aria-label={`${site.fullName} home`}>
                    <Image src={LOGO_SRC} alt={site.fullName} width={220} height={220} priority className={classes.logoImg} />
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
