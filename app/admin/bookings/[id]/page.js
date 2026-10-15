import Link from 'next/link';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Booking from '@/lib/models/Booking';
import { serializeBooking } from '@/lib/booking';
import { formatDate, formatTime, formatDuration, utcToZoned } from '@/lib/time';
import { StatusBadge } from '../booking-views';
import { PendingActions, CancelAction } from '../booking-actions';
import classes from '../../admin.module.css';
import own from '../bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Booking' };

export default async function BookingDetailPage({ params }) {
    if (!mongoose.isValidObjectId(params.id)) notFound();
    await connectDB();
    const doc = await Booking.findById(params.id).lean();
    if (!doc) notFound();
    const b = serializeBooking(doc);

    const upcoming = new Date(b.end) > new Date();
    const day = utcToZoned(b.start).date;
    const other = b.user
        ? (await Booking.find({ user: b.user, _id: { $ne: b._id } }).sort({ start: -1 }).limit(10).lean()).map(serializeBooking)
        : [];

    return (
        <main className={classes.main}>
            <p className={own.crumbs}>
                <Link href="/admin/bookings">← Bookings</Link>
                <Link href={`/admin/bookings?tab=day&date=${day}`}>That day</Link>
                <Link href={`/admin/bookings?tab=calendar&month=${day.slice(0, 7)}`}>Calendar</Link>
            </p>

            <article className={`${own.detail} ${own[`bk_${b.status}`]}`}>
                <div className={own.detailHead}>
                    <div>
                        <p className={own.detailDate}>{formatDate(b.start)}</p>
                        <p className={own.detailTime}>{formatTime(b.start)} – {formatTime(b.end)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                </div>

                <dl className={own.facts}>
                    <dt>Service</dt><dd>{b.serviceName} · {formatDuration(b.durationMinutes)}</dd>
                    <dt>Client</dt><dd>{b.clientName}</dd>
                    {b.clientEmail && <><dt>Email</dt><dd><a href={`mailto:${b.clientEmail}`}>{b.clientEmail}</a></dd></>}
                    {b.clientPhone && <><dt>Phone</dt><dd><a href={`tel:${b.clientPhone}`}>{b.clientPhone}</a></dd></>}
                    {b.clientNote && <><dt>Client note</dt><dd>{b.clientNote}</dd></>}
                    {b.adminNote && <><dt>Your note</dt><dd>{b.adminNote}</dd></>}
                    <dt>Requested</dt><dd>{b.createdAt ? `${formatDate(b.createdAt)} ${formatTime(b.createdAt)}` : '—'}{b.createdBy === 'admin' ? ' (added by admin)' : ''}</dd>
                </dl>

                {upcoming && b.status === 'pending' && <PendingActions bookingId={b._id} />}
                {upcoming && b.status === 'approved' && <CancelAction bookingId={b._id} hasEmail={!!b.clientEmail} />}
            </article>

            {other.length > 0 && (
                <>
                    <h2 className={classes.sectionTitle}>Other bookings by {b.clientName}</h2>
                    <div className={own.miniList}>
                        {other.map((o) => (
                            <Link key={o._id} href={`/admin/bookings/${o._id}`} className={own.miniItem}>
                                <span>{formatDate(o.start)}, {formatTime(o.start)}</span>
                                <span className={classes.muted}>{o.serviceName}</span>
                                <StatusBadge status={o.status} />
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}
