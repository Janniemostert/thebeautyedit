import Link from 'next/link';
import { site } from '@/lib/site';
import classes from './footer.module.css';

export default function Footer() {
    return (
        <footer className={classes.footer}>
            <div className={classes.inner}>
                <div className={classes.brandCol}>
                    <p className={classes.brand}>
                        The <span className={classes.brandMark}>Beauty</span> Edit
                        <span className={classes.brandBy}>{site.by}</span>
                    </p>
                    <p className={classes.tagline}>{site.tagline}</p>
                </div>

                <nav className={classes.links} aria-label="Footer">
                    <Link href="/work">All Work</Link>
                    <Link href="/photos">Photos</Link>
                    <Link href="/videos">Videos</Link>
                    <a href={`mailto:${site.contactEmail}`}>Contact</a>
                </nav>

                <div className={classes.socials}>
                    {site.socials.map((s) => (
                        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                            {s.label}
                        </a>
                    ))}
                </div>
            </div>
            <p className={classes.copy}>
                &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
        </footer>
    );
}
