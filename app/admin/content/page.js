import { connectDB } from '@/lib/db';
import Work from '@/lib/models/Work';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import classes from '../admin.module.css';
import { DeleteWorkButton, ToggleStatusButton, ToggleFeaturedButton } from './WorkButtons';
import { getWorkThumbnail } from '@/lib/video';

export const dynamic = 'force-dynamic';

export default async function AdminWorkPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/');

    await connectDB();
    const works = await Work.find({}).sort({ createdAt: -1 }).lean();

    return (
        <main className={classes.main}>
            <div className={classes.toolbar}>
                <h1>Content</h1>
                <Link href="/admin/content/new" className={classes.btn}>+ New Content</Link>
            </div>

            <div className={classes.tableWrap}>
                <table className={classes.table}>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Featured</th>
                            <th>Access</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {works.length === 0 && (
                            <tr><td colSpan={8} className={classes.emptyRow}>No content yet. Add your first post.</td></tr>
                        )}
                        {works.map((w) => {
                            const id = w._id.toString();
                            const thumb = getWorkThumbnail(w);
                            return (
                                <tr key={id}>
                                    <td>
                                        <div className={classes.thumb}>
                                            {thumb && <Image src={thumb} alt="" fill sizes="64px" style={{ objectFit: 'cover', objectPosition: 'center top' }} />}
                                        </div>
                                    </td>
                                    <td>
                                        <Link href={`/content/${w.slug}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>
                                            {w.title}
                                        </Link>
                                        {w.images?.length > 0 && (
                                            <div className={classes.muted}>{w.images.length} image{w.images.length === 1 ? '' : 's'}</div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${classes.badge} ${classes[w.type || 'photo']}`}>{w.type || 'photo'}</span>
                                        {w.format === 'beforeAfter' && <div className={classes.muted}>Before &amp; after</div>}
                                    </td>
                                    <td><ToggleFeaturedButton id={id} featured={!!w.featured} /></td>
                                    <td>
                                        <span className={`${classes.badge} ${w.isSubscriberOnly ? classes.pending : classes.active}`}>
                                            {w.isSubscriberOnly ? 'Members' : 'Public'}
                                        </span>
                                    </td>
                                    <td><ToggleStatusButton id={id} status={w.status || 'published'} /></td>
                                    <td className={classes.muted}>{new Date(w.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className={classes.actions}>
                                            <Link href={`/admin/content/${id}/edit`} className={classes.ghostBtn}>Edit</Link>
                                            <DeleteWorkButton id={id} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
