import { connectDB } from '@/lib/db';
import Comment from '@/lib/models/Comment';
import User from '@/lib/models/User';
import { getWorkBySlug, getViewer } from '@/lib/work';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Gallery from '@/app/components/work/gallery';
import VideoEmbed from '@/app/components/work/video-embed';
import Comments from '@/app/components/comments/Comments';
import classes from './work.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const work = await getWorkBySlug(params.slug);
    if (!work) return { title: 'Not found' };
    return {
        title: work.title,
        description: work.description ? work.description.slice(0, 160) : undefined,
        openGraph: work.coverImage ? { images: [work.coverImage] } : undefined,
    };
}

function TypeBadge({ type }) {
    return (
        <span className={type === 'video' ? classes.videoTag : classes.photoTag}>
            {type === 'video' ? 'Video' : 'Photo'}
        </span>
    );
}

export default async function WorkPage({ params }) {
    const [{ session, isActive, isAdmin, userId }, work] = await Promise.all([
        getViewer(),
        getWorkBySlug(params.slug),
    ]);

    if (!work || (work.status === 'draft' && !isAdmin)) notFound();

    // Gate members-only content
    if (work.isSubscriberOnly && !isActive) {
        return (
            <main className={classes.main}>
                <article>
                    <header className={classes.header}>
                        <div className={classes.meta}>
                            <TypeBadge type={work.type} />
                            <span className={classes.subTag}>Members Only</span>
                        </div>
                        <h1>{work.title}</h1>
                    </header>
                    {work.coverImage && (
                        <div className={`${classes.cover} ${classes.coverBlur}`}>
                            <Image src={work.coverImage} alt={work.title} fill sizes="100vw" style={{ objectFit: 'cover' }} />
                        </div>
                    )}
                    <div className={classes.gate}>
                        <p>🔒 This piece is available to members only.</p>
                        {!session
                            ? <Link href="/auth/signin" className={classes.gateBtn}>Sign in to request access</Link>
                            : session.user?.status === 'pending'
                            ? <p className={classes.gateNote}>Your access request is pending approval.</p>
                            : <p className={classes.gateNote}>Your membership is not active. <Link href="/pending">Learn more</Link>.</p>
                        }
                    </div>
                </article>
            </main>
        );
    }

    // Comments
    await connectDB();
    const rawComments = await Comment.find({ postId: work._id }).sort({ createdAt: 1 }).lean();
    const userIds = [...new Set(rawComments.map((c) => c.userId.toString()))];
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).lean() : [];
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const comments = rawComments.map((c) => {
        const u = userMap[c.userId.toString()];
        return {
            _id:        c._id.toString(),
            parentId:   c.parentId?.toString() || null,
            body:       c.body,
            createdAt:  c.createdAt.toISOString(),
            userName:   u?.name || 'Unknown',
            userEmail:  u?.email || '',
            userId:     c.userId.toString(),
            userActive: u?.status === 'active' || u?.role === 'admin',
        };
    });

    const galleryImages = work.images.filter((img) => img !== work.coverImage);
    const showCover = work.coverImage && work.type !== 'video';

    return (
        <main className={classes.main}>
            <article>
                <header className={classes.header}>
                    <div className={classes.meta}>
                        <TypeBadge type={work.type} />
                        {work.isSubscriberOnly && <span className={classes.subTag}>Members Only</span>}
                        {work.status === 'draft' && <span className={classes.draftTag}>Draft preview</span>}
                    </div>
                    <h1>{work.title}</h1>
                    <p className={classes.date}>
                        {new Date(work.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </header>

                {work.type === 'video' && (
                    <div className={classes.block}>
                        <VideoEmbed link={work.videoLink} title={work.title} />
                    </div>
                )}

                {showCover && (
                    <div className={classes.cover}>
                        <Image src={work.coverImage} alt={work.title} fill sizes="100vw" priority style={{ objectFit: 'cover' }} />
                    </div>
                )}

                {work.description && (
                    <div className={classes.body} dangerouslySetInnerHTML={{ __html: work.description.replace(/\n/g, '<br/>') }} />
                )}

                {work.type !== 'video' && work.videoLink && (
                    <div className={classes.block}>
                        <h2>Video</h2>
                        <VideoEmbed link={work.videoLink} title={work.title} />
                    </div>
                )}

                {(work.type === 'video' ? work.images : galleryImages).length > 0 && (
                    <div className={classes.block}>
                        <h2>Gallery</h2>
                        <Gallery images={work.type === 'video' ? work.images : galleryImages} title={work.title} />
                    </div>
                )}

                {work.tags.length > 0 && (
                    <ul className={classes.tags}>
                        {work.tags.map((t) => <li key={t}>#{t}</li>)}
                    </ul>
                )}

                <p className={classes.backLink}>
                    <Link href={work.type === 'video' ? '/videos' : '/photos'}>← Back to {work.type === 'video' ? 'videos' : 'photos'}</Link>
                </p>
            </article>

            <Comments
                postId={work._id}
                postType="work"
                slug={work.slug}
                comments={comments}
                canComment={isActive}
                currentUserId={userId}
                isAdmin={isAdmin}
            />
        </main>
    );
}
