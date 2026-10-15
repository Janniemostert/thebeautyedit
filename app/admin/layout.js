import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/User';
import classes from './layout.module.css';

export default async function AdminLayout({ children }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/');

    // Waiting counts shown next to the links so new requests are hard to miss.
    await connectDB();
    const [pendingBookings, pendingUsers] = await Promise.all([
        Booking.countDocuments({ status: 'pending', end: { $gte: new Date() } }),
        User.countDocuments({ status: 'pending' }),
    ]);

    return (
        <div className={classes.layout}>
            <nav className={classes.sidebar} aria-label="Admin">
                <h2>Admin</h2>
                <Link href="/admin/bookings">
                    Bookings{pendingBookings > 0 && <span className={classes.count}>{pendingBookings}</span>}
                </Link>
                <Link href="/admin/schedule">Schedule</Link>
                <Link href="/admin/services">Services</Link>
                <Link href="/admin">
                    Users{pendingUsers > 0 && <span className={classes.count}>{pendingUsers}</span>}
                </Link>
                <Link href="/admin/content">Content</Link>
                <Link href="/admin/content/new" className={classes.primary}>+ New Content</Link>
                <Link href="/" className={classes.secondary}>← View site</Link>
            </nav>
            <div className={classes.content}>{children}</div>
        </div>
    );
}
