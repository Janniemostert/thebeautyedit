import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="not-found">
            <h1>404</h1>
            <p>We could not find that page.</p>
            <p><Link href="/work">Browse the work instead →</Link></p>
        </main>
    );
}
