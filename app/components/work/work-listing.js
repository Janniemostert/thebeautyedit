import Link from 'next/link';
import WorkCard from './work-card';
import { getPublishedWork, getViewer } from '@/lib/work';
import classes from './work-listing.module.css';

const COPY = {
    all:   { title: 'All Work',  intro: 'Every photo and video project, newest first.' },
    photo: { title: 'Photos',    intro: 'Photo edits, retouching and colour work.' },
    video: { title: 'Videos',    intro: 'Cuts, colour grades and motion pieces.' },
};

export default async function WorkListing({ type = null }) {
    const [{ isActive, session, status }, works] = await Promise.all([
        getViewer(),
        getPublishedWork({ type }),
    ]);

    const copy = COPY[type || 'all'];
    const lockedCount = isActive ? 0 : works.filter((w) => w.isSubscriberOnly).length;

    return (
        <main className={classes.main}>
            <header className={classes.header}>
                <h1>{copy.title}</h1>
                <p>{copy.intro}</p>
            </header>

            <nav className={classes.filters} aria-label="Filter">
                <Link href="/work"   className={!type ? classes.filterActive : classes.filter}>All</Link>
                <Link href="/photos" className={type === 'photo' ? classes.filterActive : classes.filter}>Photos</Link>
                <Link href="/videos" className={type === 'video' ? classes.filterActive : classes.filter}>Videos</Link>
            </nav>

            {lockedCount > 0 && (
                <div className={classes.banner}>
                    {!session
                        ? <>🔒 {lockedCount} {lockedCount === 1 ? 'piece is' : 'pieces are'} for members only. <Link href="/auth/signin">Sign in</Link> to request access.</>
                        : status === 'pending'
                        ? <>⏳ {lockedCount} {lockedCount === 1 ? 'piece' : 'pieces'} will unlock once your access is approved.</>
                        : <>🔒 {lockedCount} {lockedCount === 1 ? 'piece is' : 'pieces are'} for active members. <Link href="/pending">Learn more</Link>.</>
                    }
                </div>
            )}

            {works.length === 0 ? (
                <p className={classes.empty}>Nothing published here yet. Check back soon.</p>
            ) : (
                <div className={classes.grid}>
                    {works.map((w) => (
                        <WorkCard key={w._id} work={w} locked={w.isSubscriberOnly && !isActive} />
                    ))}
                </div>
            )}
        </main>
    );
}
