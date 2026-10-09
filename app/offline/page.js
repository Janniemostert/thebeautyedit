import Link from 'next/link';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
    return (
        <main className="not-found">
            <h1>Offline</h1>
            <p>You are not connected right now. Pages you have already opened will still work.</p>
            <p><Link href="/">Try the home page →</Link></p>
        </main>
    );
}
