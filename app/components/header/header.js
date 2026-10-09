import Link from 'next/link';
import Image from 'next/image';
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
                <Link href="/" className={classes.logo} aria-label={`${site.fullName} home`}>
                    <span className={classes.logoTile}>
                        <Image src="/logo.png" alt="" width={48} height={48} priority />
                    </span>
                    <span className={classes.logoWords}>
                        <span className={classes.logoText}>
                            The <span className={classes.logoMark}>Beauty</span> Edit
                        </span>
                        <span className={classes.logoBy}>{site.by}</span>
                    </span>
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
