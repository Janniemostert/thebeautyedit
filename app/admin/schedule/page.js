import Link from 'next/link';
import { getSchedule, getServices } from '@/lib/booking';
import { deleteOverride, deleteBlock } from '@/lib/scheduleActions';
import { formatDateStr, todayInZone } from '@/lib/time';
import { site } from '@/lib/site';
import { WeeklyHoursForm, OverrideForm, BlockForm } from './schedule-forms';
import classes from '../admin.module.css';
import own from '../bookings/bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Schedule' };

function dateRange(a, b) {
    return a === b ? formatDateStr(a, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        : `${formatDateStr(a, { day: 'numeric', month: 'short' })} – ${formatDateStr(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default async function AdminSchedulePage() {
    const [schedule, services] = await Promise.all([getSchedule(), getServices()]);
    const today = todayInZone();
    const overrides = schedule.overrides.filter((o) => o.date >= today);
    const blocks    = schedule.blocks.filter((b) => b.endDate >= today);

    return (
        <main className={classes.main}>
            <h1>Schedule</h1>
            {services.length === 0 && (
                <p className={own.warning}>
                    Clients can&apos;t book yet: there are no services. Open times are worked out per service
                    (its length decides which start times fit), so <Link href="/admin/services">add a service first</Link>.
                </p>
            )}
            <p className={own.hint}>
                Clients only see times that fit inside your open hours, are not blocked and don&apos;t overlap a confirmed booking.
                Pending requests don&apos;t take a time until you approve them. All times are {site.timeZoneLabel}.
            </p>

            <h2 className={classes.sectionTitle}>Weekly hours &amp; booking rules</h2>
            <WeeklyHoursForm schedule={schedule} />

            <h2 className={classes.sectionTitle}>Block out dates or hours</h2>
            <p className={own.hint}>
                Holidays, events, personal time. Leave &quot;All day&quot; on to block whole days, or set hours to block
                only those hours on every day in the range (e.g. 12:00–14:00 from Mon to Fri).
            </p>
            <BlockForm />
            {blocks.length > 0 && (
                <div className={classes.tableWrap} style={{ marginTop: '1rem' }}>
                    <table className={classes.table}>
                        <thead><tr><th>Dates</th><th>Hours</th><th>Reason</th><th /></tr></thead>
                        <tbody>
                            {blocks.map((b) => (
                                <tr key={b._id}>
                                    <td>{dateRange(b.startDate, b.endDate)}</td>
                                    <td>{b.startTime ? `${b.startTime} – ${b.endTime}` : 'All day'}</td>
                                    <td className={classes.muted}>{b.reason || '—'}</td>
                                    <td>
                                        <form action={deleteBlock}>
                                            <input type="hidden" name="id" value={b._id} />
                                            <button type="submit" className={classes.ghostBtn}>Remove</button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 className={classes.sectionTitle}>Special hours for a specific date</h2>
            <p className={own.hint}>
                Replaces the weekly hours for that one date, e.g. open on a public holiday or a Sunday, or shorter hours on one day.
            </p>
            <OverrideForm />
            {overrides.length > 0 && (
                <div className={classes.tableWrap} style={{ marginTop: '1rem' }}>
                    <table className={classes.table}>
                        <thead><tr><th>Date</th><th>Hours</th><th>Note</th><th /></tr></thead>
                        <tbody>
                            {overrides.map((o) => (
                                <tr key={o._id}>
                                    <td>{dateRange(o.date, o.date)}</td>
                                    <td>{o.ranges.length ? o.ranges.map((r) => `${r.start} – ${r.end}`).join(', ') : 'Closed'}</td>
                                    <td className={classes.muted}>{o.note || '—'}</td>
                                    <td>
                                        <form action={deleteOverride}>
                                            <input type="hidden" name="id" value={o._id} />
                                            <button type="submit" className={classes.ghostBtn}>Remove</button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
