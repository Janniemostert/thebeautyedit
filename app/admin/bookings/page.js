import { connectDB } from '@/lib/db';
import Booking from '@/lib/models/Booking';
import { serializeBooking, getServices } from '@/lib/booking';
import { formatDate, formatTime, formatDuration, utcToZoned, todayInZone } from '@/lib/time';
import { PendingActions, CancelAction } from './booking-actions';
import AddBookingForm from './add-booking-form';
import classes from '../admin.module.css';
import own from './bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bookings' };

function Client({ b }) {
    return (
        <div className={own.client}>
            <strong>{b.clientName}</strong>
            {b.clientEmail && <a href={`mailto:${b.clientEmail}`}>{b.clientEmail}</a>}
            {b.clientPhone && <a href={`tel:${b.clientPhone}`}>{b.clientPhone}</a>}
            {b.createdBy === 'admin' && <span className={classes.muted}>Added by admin</span>}
        </div>
    );
}

export default async function AdminBookingsPage() {
    await connectDB();
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const [pendingDocs, upcomingDocs, recentDocs, services] = await Promise.all([
        Booking.find({ status: 'pending', end: { $gte: now } }).sort({ start: 1 }).lean(),
        Booking.find({ status: 'approved', end: { $gte: now } }).sort({ start: 1 }).lean(),
        Booking.find({
            $or: [
                { status: { $in: ['declined', 'cancelled'] }, decidedAt: { $gte: since } },
                { status: 'approved', end: { $lt: now, $gte: since } },
            ],
        }).sort({ start: -1 }).limit(40).lean(),
        getServices({ includeInactive: true }),
    ]);

    const pending  = pendingDocs.map(serializeBooking);
    const upcoming = upcomingDocs.map(serializeBooking);
    const recent   = recentDocs.map(serializeBooking);

    // Mark pending requests that overlap a confirmed booking.
    const clashes = new Set(
        pending.filter((p) => upcoming.some((u) => u.start < p.end && u.end > p.start)).map((p) => p._id)
    );

    // Group confirmed appointments by day.
    const today = todayInZone();
    const byDay = [];
    for (const b of upcoming) {
        const day = utcToZoned(b.start).date;
        const last = byDay[byDay.length - 1];
        if (last?.day === day) last.items.push(b);
        else byDay.push({ day, items: [b] });
    }

    return (
        <main className={classes.main}>
            <h1>Bookings</h1>

            <h2 className={classes.sectionTitle}>Requests waiting for you ({pending.length})</h2>
            {pending.length === 0 ? (
                <p className={classes.muted}>No pending requests.</p>
            ) : (
                <div className={own.cards}>
                    {pending.map((b) => (
                        <article key={b._id} className={`${own.card} ${clashes.has(b._id) ? own.clash : ''}`}>
                            <div className={own.cardTop}>
                                <div>
                                    <p className={own.when}>{formatDate(b.start)}</p>
                                    <p className={own.time}>{formatTime(b.start)} – {formatTime(b.end)}</p>
                                </div>
                                <span className={`${classes.badge} ${classes.pending}`}>Pending</span>
                            </div>
                            <p className={own.service}>{b.serviceName} · {formatDuration(b.durationMinutes)}</p>
                            <Client b={b} />
                            {b.clientNote && <p className={own.note}>“{b.clientNote}”</p>}
                            {clashes.has(b._id) && <p className={own.clashText}>Overlaps a confirmed booking.</p>}
                            <PendingActions bookingId={b._id} />
                        </article>
                    ))}
                </div>
            )}

            <h2 className={classes.sectionTitle}>Confirmed appointments</h2>
            {byDay.length === 0 ? (
                <p className={classes.muted}>No upcoming appointments.</p>
            ) : (
                byDay.map(({ day, items }) => (
                    <section key={day} className={own.day}>
                        <h3>{day === today ? 'Today' : formatDate(items[0].start)}</h3>
                        <div className={classes.tableWrap}>
                            <table className={classes.table}>
                                <tbody>
                                    {items.map((b) => (
                                        <tr key={b._id}>
                                            <td className={own.timeCell}>{formatTime(b.start)} – {formatTime(b.end)}</td>
                                            <td>{b.serviceName}<br /><span className={classes.muted}>{formatDuration(b.durationMinutes)}</span></td>
                                            <td><Client b={b} />{b.clientNote && <span className={own.note}>“{b.clientNote}”</span>}</td>
                                            <td><CancelAction bookingId={b._id} hasEmail={!!b.clientEmail} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))
            )}

            <h2 className={classes.sectionTitle}>Add a booking</h2>
            <p className={classes.muted}>For appointments made by phone, WhatsApp or in person. These are confirmed straight away.</p>
            <AddBookingForm services={services} />

            {recent.length > 0 && (
                <>
                    <h2 className={classes.sectionTitle}>Last 30 days</h2>
                    <div className={classes.tableWrap}>
                        <table className={classes.table}>
                            <thead>
                                <tr><th>When</th><th>Service</th><th>Client</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {recent.map((b) => (
                                    <tr key={b._id}>
                                        <td>{formatDate(b.start)}<br /><span className={classes.muted}>{formatTime(b.start)}</span></td>
                                        <td>{b.serviceName}</td>
                                        <td>{b.clientName}</td>
                                        <td>
                                            <span className={`${classes.badge} ${b.status === 'approved' ? classes.active : b.status === 'declined' ? classes.suspended : classes.cancelled}`}>
                                                {b.status === 'approved' ? 'done' : b.status}
                                            </span>
                                            {b.adminNote && <div className={classes.muted}>{b.adminNote}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    );
}
