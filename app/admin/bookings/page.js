import Link from 'next/link';
import { connectDB } from '@/lib/db';
import Booking from '@/lib/models/Booking';
import { serializeBooking, getServices } from '@/lib/booking';
import { formatDate, formatTime, todayInZone, addDays, zonedToUtc, isValidDate } from '@/lib/time';
import { BookingCard, DayGroups, MonthCalendar, StatusBadge } from './booking-views';
import AddBookingForm from './add-booking-form';
import classes from '../admin.module.css';
import own from './bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bookings' };

const ACTIVE = { $in: ['pending', 'approved'] };
const dayStart = (date) => zonedToUtc(date, 0);

async function find(query, sort = { start: 1 }, limit = 0) {
    let q = Booking.find(query).sort(sort);
    if (limit) q = q.limit(limit);
    return (await q.lean()).map(serializeBooking);
}

// Pending requests that overlap a confirmed booking (approving them would fail).
async function findClashes(pending) {
    if (!pending.length) return new Set();
    const approved = await find({ status: 'approved', end: { $gte: new Date() } });
    return new Set(pending.filter((p) => approved.some((a) => a.start < p.end && a.end > p.start)).map((p) => p._id));
}

export default async function AdminBookingsPage({ searchParams }) {
    await connectDB();
    const now      = new Date();
    const today    = todayInZone();
    const tomorrow = addDays(today, 1);

    // Counts for the tab badges.
    const [pendingCount, todayCount, next3Count] = await Promise.all([
        Booking.countDocuments({ status: 'pending', end: { $gte: now } }),
        Booking.countDocuments({ status: ACTIVE, start: { $gte: dayStart(today), $lt: dayStart(tomorrow) } }),
        Booking.countDocuments({ status: ACTIVE, start: { $gte: dayStart(tomorrow), $lt: dayStart(addDays(today, 4)) } }),
    ]);

    const tab = searchParams?.tab || (pendingCount > 0 ? 'requests' : 'today');

    const TABS = [
        { key: 'requests', label: 'Requests', count: pendingCount, alert: pendingCount > 0 },
        { key: 'today',    label: 'Today', count: todayCount },
        { key: 'next3',    label: 'Next 3 days', count: next3Count },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'calendar', label: 'Calendar' },
        { key: 'all',      label: 'All bookings' },
        { key: 'add',      label: '+ Add booking' },
    ];

    let content;

    if (tab === 'requests') {
        const pending = await find({ status: 'pending', end: { $gte: now } });
        const clashes = await findClashes(pending);
        content = pending.length === 0 ? (
            <p className={own.empty}>No requests waiting. New requests appear here and you get an email for each one.</p>
        ) : (
            <div className={own.bookingList}>
                {pending.map((b) => <BookingCard key={b._id} b={b} showDate clash={clashes.has(b._id)} />)}
            </div>
        );
    } else if (tab === 'today' || tab === 'day') {
        const date = tab === 'day' && isValidDate(searchParams?.date) ? searchParams.date : today;
        const items = await find({ status: ACTIVE, start: { $gte: dayStart(date), $lt: dayStart(addDays(date, 1)) } });
        const clashes = await findClashes(items.filter((b) => b.status === 'pending'));
        content = (
            <>
                <div className={own.dayNav}>
                    <Link href={`/admin/bookings?tab=day&date=${addDays(date, -1)}`} className={classes.ghostBtn}>‹ Previous day</Link>
                    <h2>{date === today ? 'Today' : formatDate(dayStart(date))}</h2>
                    <Link href={`/admin/bookings?tab=day&date=${addDays(date, 1)}`} className={classes.ghostBtn}>Next day ›</Link>
                </div>
                {items.length === 0 ? (
                    <p className={own.empty}>No appointments on this day.</p>
                ) : (
                    <div className={own.bookingList}>
                        {items.map((b) => <BookingCard key={b._id} b={b} clash={clashes.has(b._id)} />)}
                    </div>
                )}
            </>
        );
    } else if (tab === 'next3') {
        const items = await find({ status: ACTIVE, start: { $gte: dayStart(tomorrow), $lt: dayStart(addDays(today, 4)) } });
        const clashes = await findClashes(items.filter((b) => b.status === 'pending'));
        content = <DayGroups bookings={items} clashes={clashes} empty="Nothing booked for the next 3 days." />;
    } else if (tab === 'upcoming') {
        const items = await find({ status: ACTIVE, start: { $gte: dayStart(tomorrow) } }, { start: 1 }, 300);
        const clashes = await findClashes(items.filter((b) => b.status === 'pending'));
        content = <DayGroups bookings={items} clashes={clashes} empty="No upcoming appointments after today." />;
    } else if (tab === 'calendar') {
        const month = /^\d{4}-\d{2}$/.test(searchParams?.month || '') ? searchParams.month : today.slice(0, 7);
        const [y, m] = month.split('-').map(Number);
        const nextMonth = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
        const items = await find({ status: ACTIVE, start: { $gte: dayStart(`${month}-01`), $lt: dayStart(nextMonth) } });
        content = <MonthCalendar month={month} bookings={items} />;
    } else if (tab === 'all') {
        const STATUSES = ['all', 'approved', 'pending', 'declined', 'cancelled'];
        const status = STATUSES.includes(searchParams?.status) ? searchParams.status : 'all';
        const items = await find(status === 'all' ? {} : { status }, { start: -1 }, 300);
        content = (
            <>
                <div className={own.filters}>
                    {STATUSES.map((s) => (
                        <Link
                            key={s}
                            href={`/admin/bookings?tab=all&status=${s}`}
                            className={s === status ? own.filterActive : own.filter}
                        >
                            {s === 'all' ? 'All' : s === 'approved' ? 'Confirmed' : s[0].toUpperCase() + s.slice(1)}
                        </Link>
                    ))}
                </div>
                {items.length === 0 ? (
                    <p className={own.empty}>No bookings.</p>
                ) : (
                    <div className={classes.tableWrap}>
                        <table className={classes.table}>
                            <thead>
                                <tr><th>When</th><th>Service</th><th>Client</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                                {items.map((b) => (
                                    <tr key={b._id}>
                                        <td>{formatDate(b.start)}<div className={classes.muted}>{formatTime(b.start)}</div></td>
                                        <td>{b.serviceName}</td>
                                        <td className={classes.wrapText}>{b.clientName}<div className={classes.muted}>{b.clientEmail || b.clientPhone}</div></td>
                                        <td><StatusBadge status={b.status} /></td>
                                        <td><Link href={`/admin/bookings/${b._id}`} className={classes.ghostBtn}>Open</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {items.length === 300 && <p className={classes.muted}>Showing the latest 300.</p>}
            </>
        );
    } else if (tab === 'add') {
        content = (
            <>
                <p className={classes.muted}>For appointments made by phone, WhatsApp or in person. These are confirmed straight away.</p>
                <AddBookingForm services={await getServices({ includeInactive: true })} />
            </>
        );
    }

    const activeTab = tab === 'day' ? (searchParams?.date === today ? 'today' : null) : tab;

    return (
        <main className={classes.main}>
            <h1>Bookings</h1>

            {pendingCount > 0 && tab !== 'requests' && (
                <Link href="/admin/bookings?tab=requests" className={own.alertBar}>
                    {pendingCount} booking {pendingCount === 1 ? 'request is' : 'requests are'} waiting for you →
                </Link>
            )}

            <nav className={own.tabs} aria-label="Booking views">
                {TABS.map((t) => (
                    <Link
                        key={t.key}
                        href={`/admin/bookings?tab=${t.key}`}
                        className={`${own.tab} ${activeTab === t.key ? own.tabActive : ''}`}
                        aria-current={activeTab === t.key ? 'page' : undefined}
                    >
                        {t.label}
                        {t.count > 0 && <span className={`${own.tabCount} ${t.alert ? own.tabAlert : ''}`}>{t.count}</span>}
                    </Link>
                ))}
            </nav>

            <div className={own.tabPanel}>{content}</div>
        </main>
    );
}
