'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { registerUser } from '@/lib/accountActions';
import { site, LOGO_SRC } from '@/lib/site';
import { GoogleButton, safeCallback } from '../google-button';
import classes from '../signin/signin.module.css';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className={classes.submitBtn} disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
        </button>
    );
}

function RegisterForm() {
    const params      = useSearchParams();
    const callbackUrl = safeCallback(params.get('callbackUrl'));
    const [state, formAction] = useFormState(registerUser, {});
    // Kept on submit because the form may be cleared once the action finishes.
    const credentials = useRef(null);

    // Account created: sign straight in, then land on the pending page.
    useEffect(() => {
        if (!state.success || !credentials.current) return;
        signIn('credentials', { ...credentials.current, redirect: false })
            .then(() => { window.location.href = '/pending'; });
    }, [state]);

    function rememberCredentials(e) {
        const form = new FormData(e.currentTarget);
        credentials.current = { email: form.get('email'), password: form.get('password') };
    }

    return (
        <>
            <h1>Create an account</h1>
            <p>New accounts are approved by hand. You will get an email as soon as yours is active.</p>

            <GoogleButton callbackUrl={callbackUrl} label="Sign up with Google" />

            <div className={classes.divider}><span>or with email</span></div>

            <form action={formAction} onSubmit={rememberCredentials} className={classes.form}>
                <label className={classes.field}>
                    <span>Full name</span>
                    <input type="text" name="name" autoComplete="name" required />
                </label>
                <label className={classes.field}>
                    <span>Email</span>
                    <input type="email" name="email" autoComplete="email" required />
                </label>
                <label className={classes.field}>
                    <span>Phone (optional)</span>
                    <input type="tel" name="phone" autoComplete="tel" />
                </label>
                <label className={classes.field}>
                    <span>Password</span>
                    <input type="password" name="password" autoComplete="new-password" minLength={8} required />
                    <small>At least 8 characters.</small>
                </label>
                <label className={classes.field}>
                    <span>Confirm password</span>
                    <input type="password" name="confirm" autoComplete="new-password" minLength={8} required />
                </label>
                {state.error && <p className={classes.error} role="alert">{state.error}</p>}
                {state.success
                    ? <p className={classes.small}>Account created, signing you in…</p>
                    : <SubmitButton />}
            </form>

            <p className={classes.switch}>
                Already have an account? <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in</Link>
            </p>
        </>
    );
}

export default function RegisterPage() {
    return (
        <main className={classes.main}>
            <div className={classes.card}>
                <span className={classes.logoTile}>
                    <Image src={LOGO_SRC} alt={site.fullName} width={96} height={96} />
                </span>
                <p className={classes.brand}>The <span>Beauty</span> Edit <small>{site.by}</small></p>
                <Suspense fallback={null}>
                    <RegisterForm />
                </Suspense>
            </div>
        </main>
    );
}
