'use client';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { site } from '@/lib/site';
import classes from './signin.module.css';

export default function SignInPage() {
    return (
        <main className={classes.main}>
            <div className={classes.card}>
                <span className={classes.logoTile}>
                    <Image src="/logo.png" alt={site.fullName} width={72} height={72} />
                </span>
                <p className={classes.brand}>The <span>Beauty</span> Edit <small>{site.by}</small></p>
                <h1>Sign in</h1>
                <p>Sign in with Google to comment on looks and request access to members-only content.</p>
                <button onClick={() => signIn('google', { callbackUrl: '/' })} className={classes.googleBtn}>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/>
                        <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z"/>
                        <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    Continue with Google
                </button>
                <p className={classes.small}>By signing in you agree to the {site.name} terms of use.</p>
            </div>
        </main>
    );
}
