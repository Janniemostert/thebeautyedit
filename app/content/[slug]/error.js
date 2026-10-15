'use client';

export default function WorkError({ error, reset }) {
    return (
        <main className="error">
            <h1>Something went wrong</h1>
            <p>{error?.message || 'An unexpected error occurred.'}</p>
            <button
                onClick={reset}
                style={{
                    background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
                    padding: '0.5rem 1.2rem', borderRadius: 999, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit',
                }}
            >
                Try again
            </button>
        </main>
    );
}
