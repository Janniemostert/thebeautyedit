'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import md5 from 'md5';
import Image from 'next/image';
import Link from 'next/link';
import classes from './auth-nav.module.css';

export default function AuthNav() {
    const { data: session, status } = useSession();

    if (status === 'loading') return null;

    if (!session) {
        return (
            <button onClick={() => signIn('google', { callbackUrl: '/' })} className={classes.signInBtn}>
                Sign In
            </button>
        );
    }

    const emailHash = md5(session.user.email.trim().toLowerCase());
    const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=36`;

    return (
        <div className={classes.userArea}>
            {session.user.role === 'admin' && (
                <Link href="/admin" className={classes.adminLink}>Admin</Link>
            )}
            <Image
                src={gravatarUrl}
                alt={session.user.name}
                width={32}
                height={32}
                className={classes.avatar}
                unoptimized
            />
            <span className={classes.name}>{session.user.name.split(' ')[0]}</span>
            {session.user.status === 'pending' && (
                <Link href="/pending" className={classes.pendingBadge}>Pending</Link>
            )}
            <button onClick={() => signOut({ callbackUrl: '/' })} className={classes.signOutBtn}>
                Sign Out
            </button>
        </div>
    );
}
