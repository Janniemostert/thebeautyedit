'use client';
import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { GoogleButton, safeCallback } from '../google-button';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { site, LOGO_SRC } from '@/lib/site';
import classes from './signin.module.css';

function SignInForm() {
    const params      = useSearchParams();
    const callbackUrl = safeCallback(params.get('callbackUrl'));
    const [error, setError] = useState(params.get('error') ? 'Sign-in failed. Please try again.' : '');
    const [busy, setBusy]   = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setBusy(true);
        setError('');
        const form = new FormData(e.currentTarget);
        const res = await signIn('credentials', {
            email:    form.get('email'),
            password: form.get('password'),
            redirect: false,
        });
        if (res?.ok) {
            // Full reload so the header and server pages pick up the new session.
            window.location.href = callbackUrl;
            return;
        }
        setBusy(false);
        setError('Incorrect email or password.');
    }

    return (
        <>
            <h1>Sign in</h1>
            <p>Sign in to book appointments, comment on looks and see members-only work.</p>

            <GoogleButton callbackUrl={callbackUrl} />

            <div className={classes.divider}><span>or with email</span></div>

            <form onSubmit={handleSubmit} className={classes.form}>
                <label className={classes.field}>
                    <span>Email</span>
                    <input type="email" name="email" autoComplete="email" required />
                </label>
                <label className={classes.field}>
                    <span>Password</span>
                    <input type="password" name="password" autoComplete="current-password" required />
                </label>
                {error && <p className={classes.error} role="alert">{error}</p>}
                <button type="submit" className={classes.submitBtn} disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <p className={classes.switch}>
                New here? <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Create an account</Link>
            </p>
        </>
    );
}

export default function SignInPage() {
    return (
        <main className={classes.main}>
            <div className={classes.card}>
                <span className={classes.logoTile}>
                    <Image src={LOGO_SRC} alt={site.fullName} width={96} height={96} />
                </span>
                <p className={classes.brand}>The <span>Beauty</span> Edit <small>{site.by}</small></p>
                <Suspense fallback={null}>
                    <SignInForm />
                </Suspense>
                <p className={classes.small}>By signing in you agree to the {site.name} terms of use.</p>
            </div>
        </main>
    );
}
