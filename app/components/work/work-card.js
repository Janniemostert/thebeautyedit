import Link from 'next/link';
import Image from 'next/image';
import { getVideoThumbnail } from '@/lib/video';
import classes from './work-card.module.css';

export default function WorkCard({ work, locked = false }) {
    const thumb = work.coverImage || (work.type === 'video' ? getVideoThumbnail(work.videoLink) : null);

    return (
        <Link href={`/work/${work.slug}`} className={classes.card}>
            <div className={classes.media}>
                {thumb ? (
                    <Image
                        src={thumb}
                        alt={work.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                    />
                ) : (
                    <div className={classes.placeholder} aria-hidden="true">
                        {work.type === 'video' ? '▶' : '◻'}
                    </div>
                )}
                <div className={classes.badges}>
                    <span className={`${classes.badge} ${work.type === 'video' ? classes.video : classes.photo}`}>
                        {work.type === 'video' ? 'Video' : 'Photo'}
                    </span>
                    {locked && <span className={`${classes.badge} ${classes.locked}`}>🔒 Members</span>}
                </div>
                {work.type === 'video' && (
                    <span className={classes.playIcon} aria-hidden="true">▶</span>
                )}
            </div>
            <div className={classes.body}>
                <h3>{work.title}</h3>
                {work.tags.length > 0 && (
                    <p className={classes.tags}>{work.tags.slice(0, 4).map((t) => `#${t}`).join(' ')}</p>
                )}
            </div>
        </Link>
    );
}
