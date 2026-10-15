// Server-rendered building blocks for Admin → Bookings.
import Link from 'next/link';
import { formatDate, formatTime, formatDuration, formatDateStr, utcToZoned, todayInZone, addDays, weekdayOf } from '@/lib/time';
import { PendingActions, CancelAction } from './booking-actions';
import classes from '../admin.module.css';
import own from './bookings.module.css';

const STATUS_LABEL = { pending: 'Pending', approved: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled' };

export function StatusBadge({ status }) {
    return <span className={`${own.status} ${own[`st_${status}`]}`}>{STATUS_LABEL[status]}</span>;
}

export function Client({ b }) {
    return (
        <div className={own.client}>
            <strong>{b.clientName}</strong>
            {b.clientEmail && <a href={`mailto:${b.clientEmail}`}>{b.clientEmail}</a>}
            {b.clientPhone && <a href={`tel:${b.clientPhone}`}>{b.clientPhone}</a>}
            {b.createdBy === 'admin' && <span className={classes.muted}>Added by admin</span>}
        </div>
    );
}

// One booking. Confirmed ones get the strong green treatment; pending ones amber.
export function BookingCard({ b, showDate = false, clash = false, actions = true }) {
    const upcoming = new Date(b.end) > new Date();
    return (
        <article className={`${own.booking} ${own[`bk_${b.status}`]} ${clash ? own.clash : ''}`}>
            <Link href={`/admin/bookings/${b._id}`} className={own.bookingTime}>
                {showDate && <span className={own.bookingDate}>{formatDateStr(utcToZoned(b.start).date)}</span>}
                <span className={own.bookingClock}>{formatTime(b.start)}</span>
                <span className={own.bookingUntil}>until {formatTime(b.end)}</span>
            </Link>
            <div className={own.bookingBody}>
                <div className={own.bookingHead}>
                    <Link href={`/admin/bookings/${b._id}`} className={own.bookingService}>{b.serviceName}</Link>
                    <StatusBadge status={b.status} />
                </div>
                <span className={classes.muted}>{formatDuration(b.durationMinutes)}</span>
                <Client b={b} />
                {b.clientNote && <p className={own.note}>“{b.clientNote}”</p>}
                {clash && <p className={own.clashText}>Overlaps a confirmed booking.</p>}
                {actions && upcoming && b.status === 'pending' && <PendingActions bookingId={b._id} />}
                {actions && upcoming && b.status === 'approved' && (
                    <div className={own.actions}><CancelAction bookingId={b._id} hasEmail={!!b.clientEmail} /></div>
                )}
            </div>
        </article>
    );
}

// Bookings grouped under a heading per day.
export function DayGroups({ bookings, empty, clashes }) {
    if (!bookings.length) return <p className={own.empty}>{empty}</p>;

    const today = todayInZone();
    const groups = [];
    for (const b of bookings) {
        const day = utcToZoned(b.start).date;
        const last = groups[groups.length - 1];
        if (last?.day === day) last.items.push(b);
        else groups.push({ day, items: [b] });
    }

    return groups.map(({ day, items }) => (
        <section key={day} className={own.day}>
            <h3 className={own.dayTitle}>
                <Link href={`/admin/bookings?tab=day&date=${day}`}>
                    {day === today ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : formatDate(items[0].start)}
                </Link>
                <span className={classes.muted}>
                    {items.filter((b) => b.status === 'approved').length} confirmed
                    {items.some((b) => b.status === 'pending') && `, ${items.filter((b) => b.status === 'pending').length} pending`}
                </span>
            </h3>
            <div className={own.bookingList}>
                {items.map((b) => <BookingCard key={b._id} b={b} clash={clashes?.has(b._id)} />)}
            </div>
        </section>
    ));
}

const WEEK_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Month grid. Each booking links to its page, each day number to that day's list.
export function MonthCalendar({ month, bookings }) {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const first = `${month}-01`;
    const today = todayInZone();
    const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

    const byDay = new Map();
    for (const b of bookings) {
        const d = utcToZoned(b.start).date;
        if (!byDay.has(d)) byDay.set(d, []);
        byDay.get(d).push(b);
    }

    const cells = Array((weekdayOf(first) + 6) % 7).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);

    return (
        <div className={own.cal}>
            <div className={own.calNav}>
                <Link href={`/admin/bookings?tab=calendar&month=${prev}`} className={classes.ghostBtn}>‹ Prev</Link>
                <h2>{formatDateStr(first, { month: 'long', year: 'numeric' })}</h2>
                <Link href={`/admin/bookings?tab=calendar&month=${next}`} className={classes.ghostBtn}>Next ›</Link>
            </div>
            <div className={own.calLegend}>
                <span><i className={own.dotApproved} /> Confirmed</span>
                <span><i className={own.dotPending} /> Pending</span>
                <Link href="/admin/bookings?tab=calendar">This month</Link>
            </div>
            <div className={own.calGrid}>
                {WEEK_HEAD.map((d) => <span key={d} className={own.calDow}>{d}</span>)}
                {cells.map((d, i) => {
                    if (!d) return <span key={`pad-${i}`} className={own.calPad} />;
                    const items = byDay.get(d) || [];
                    return (
                        <div key={d} className={`${own.calCell} ${d === today ? own.calToday : ''} ${d < today ? own.calPast : ''}`}>
                            <Link href={`/admin/bookings?tab=day&date=${d}`} className={own.calNum}>{Number(d.slice(8))}</Link>
                            {items.slice(0, 4).map((b) => (
                                <Link
                                    key={b._id}
                                    href={`/admin/bookings/${b._id}`}
                                    className={`${own.calItem} ${b.status === 'approved' ? own.calApproved : own.calPendingItem}`}
                                    title={`${formatTime(b.start)} ${b.serviceName} – ${b.clientName}`}
                                >
                                    <b>{formatTime(b.start)}</b> {b.clientName.split(' ')[0]}
                                </Link>
                            ))}
                            {items.length > 4 && (
                                <Link href={`/admin/bookings?tab=day&date=${d}`} className={own.calMore}>+{items.length - 4} more</Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
