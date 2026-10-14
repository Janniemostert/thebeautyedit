import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import Booking from '@/lib/models/Booking';
import { serializeBooking } from '@/lib/booking';
import { getViewer } from '@/lib/work';
import { formatDate, formatTime, formatDuration } from '@/lib/time';
import CancelButton from './cancel-button';
import classes from './bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My bookings' };

const STATUS_LABEL = {
    pending:   'Awaiting confirmation',
    approved:  'Confirmed',
    declined:  'Not available',
    cancelled: 'Cancelled',
};

function BookingRow({ b, canCancel }) {
    return (
        <li className={classes.item}>
            <div className={classes.when}>
                <strong>{formatDate(b.start)}</strong>
                <span>{formatTime(b.start)} – {formatTime(b.end)}</span>
            </div>
            <div className={classes.what}>
                <span>{b.serviceName}</span>
                <span className={classes.muted}>{formatDuration(b.durationMinutes)}</span>
                {b.adminNote && b.status !== 'approved' && <span className={classes.note}>{b.adminNote}</span>}
            </div>
            <div className={classes.side}>
                <span className={`${classes.badge} ${classes[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                {canCancel && <CancelButton bookingId={b._id} confirmed={b.status === 'approved'} />}
            </div>
        </li>
    );
}

export default async function MyBookingsPage() {
    const { userId } = await getViewer();
    if (!userId) redirect('/auth/signin?callbackUrl=/bookings');

    await connectDB();
    const docs = await Booking.find({ user: userId }).sort({ start: 1 }).lean();
    const all = docs.map(serializeBooking);
    const now = new Date().toISOString();

    const upcoming = all.filter((b) => b.end >= now && ['pending', 'approved'].includes(b.status));
    const past     = all.filter((b) => !upcoming.includes(b)).reverse();

    return (
        <main className={classes.main}>
            <div className={classes.head}>
                <h1>My bookings</h1>
                <Link href="/book" className={classes.primaryBtn}>+ New booking</Link>
            </div>

            <h2 className={classes.sectionTitle}>Upcoming</h2>
            {upcoming.length === 0 ? (
                <p className={classes.muted}>No upcoming appointments. <Link href="/book">Book one</Link>.</p>
            ) : (
                <ul className={classes.list}>
                    {upcoming.map((b) => <BookingRow key={b._id} b={b} canCancel={b.start > now} />)}
                </ul>
            )}

            {past.length > 0 && (
                <>
                    <h2 className={classes.sectionTitle}>Past and cancelled</h2>
                    <ul className={`${classes.list} ${classes.past}`}>
                        {past.map((b) => <BookingRow key={b._id} b={b} canCancel={false} />)}
                    </ul>
                </>
            )}
        </main>
    );
}
