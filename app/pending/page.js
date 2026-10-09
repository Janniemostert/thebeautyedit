import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { site } from '@/lib/site';
import classes from './pending.module.css';

export const metadata = { title: 'Access' };

export default async function PendingPage() {
    const session = await getServerSession(authOptions);

    // Active users / admins don't belong here
    if (!session || session.user?.status === 'active' || session.user?.role === 'admin') {
        redirect('/');
    }

    const status = session.user?.status;
    const isPending   = status === 'pending';
    const isSuspended = status === 'suspended';
    const isCancelled = status === 'cancelled';

    return (
        <main className={classes.main}>
            <div className={classes.card}>
                {isPending && (
                    <>
                        <div className={classes.badge}>⏳ Pending approval</div>
                        <h1>Thanks for signing up!</h1>
                        <p>Your account is <strong>awaiting approval</strong>. Once it is approved you will be able to comment and view members-only work.</p>
                    </>
                )}
                {isSuspended && (
                    <>
                        <div className={`${classes.badge} ${classes.badgeSuspended}`}>⚠️ Account suspended</div>
                        <h1>Account suspended</h1>
                        <p>Your account has been suspended. Please get in touch if you believe this is a mistake.</p>
                    </>
                )}
                {isCancelled && (
                    <>
                        <div className={`${classes.badge} ${classes.badgeInactive}`}>🔒 Access inactive</div>
                        <h1>Access inactive</h1>
                        <p>Your membership is no longer active. Get in touch to re-activate it.</p>
                    </>
                )}

                <p className={classes.contact}>
                    Questions? <a href={`mailto:${site.contactEmail}`}>Contact us</a>
                </p>

                <div className={classes.termsBox}>
                    <h2>Terms of use</h2>
                    <p>All work published on {site.name} remains the property of its creator. You may view it for personal, non-commercial purposes only and may not reproduce, distribute or sell any content without written permission. Access may be suspended or revoked at any time for violation of these terms.</p>
                </div>

                <div className={classes.browseSection}>
                    <p>In the meantime, you can browse everything that is public:</p>
                    <div className={classes.browseLinks}>
                        <Link href="/photos" className={classes.browseBtn}>Photos</Link>
                        <Link href="/videos" className={classes.browseBtn}>Videos</Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
