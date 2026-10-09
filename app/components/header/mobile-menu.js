'use client';
import { useState } from 'react';
import NavLink from './nav-link';
import AuthNav from './auth-nav';
import classes from './mobile-menu.module.css';

export default function MobileMenu({ links }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                className={classes.burger}
                onClick={() => setOpen((o) => !o)}
                aria-label="Toggle menu"
                aria-expanded={open}
            >
                <span className={open ? `${classes.barTop} ${classes.barTopOpen}` : classes.barTop} />
                <span className={open ? `${classes.barMid} ${classes.barMidOpen}` : classes.barMid} />
                <span className={open ? `${classes.barBot} ${classes.barBotOpen}` : classes.barBot} />
            </button>

            {open && (
                <div className={classes.drawer} onClick={() => setOpen(false)}>
                    <nav className={classes.nav} onClick={(e) => e.stopPropagation()}>
                        {links.map((l) => (
                            <NavLink key={l.href} href={l.href} onClick={() => setOpen(false)}>
                                {l.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className={classes.auth} onClick={(e) => e.stopPropagation()}>
                        <AuthNav />
                    </div>
                </div>
            )}
        </>
    );
}
