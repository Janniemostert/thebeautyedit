'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { fetchAvailability, requestBooking } from '@/lib/bookingActions';
import { formatDateStr, formatDuration, weekdayOf } from '@/lib/time';
import { site } from '@/lib/site';
import classes from './book.module.css';

const WEEK_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// All dates of a month ("YYYY-MM"), padded so the grid starts on Monday.
function monthCells(month) {
    const [y, m] = month.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const first = `${month}-01`;
    const pad = (weekdayOf(first) + 6) % 7;
    const cells = Array(pad).fill(null);
    for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
    return cells;
}

function shiftMonth(month, n) {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className={classes.primaryBtn} disabled={pending}>
            {pending ? 'Sending request…' : 'Request this booking'}
        </button>
    );
}

export default function BookingFlow({ services, initialServiceId, viewer }) {
    const [serviceId, setServiceId] = useState(initialServiceId);
    const [days, setDays]           = useState(null);
    const [month, setMonth]         = useState(null);
    const [date, setDate]           = useState(null);
    const [slot, setSlot]           = useState(null);
    const [loading, startLoading]   = useTransition();
    const [state, formAction]       = useFormState(requestBooking, {});

    const service = services.find((s) => s._id === serviceId);
    const byDate  = useMemo(() => new Map((days || []).map((d) => [d.date, d.slots])), [days]);
    const months  = useMemo(() => [...new Set((days || []).map((d) => d.date.slice(0, 7)))], [days]);

    function loadAvailability(id) {
        setDays(null);
        setDate(null);
        setSlot(null);
        startLoading(async () => {
            const result = await fetchAvailability(id);
            setDays(result || []);
            setMonth(result?.[0]?.date.slice(0, 7) || null);
        });
    }

    useEffect(() => {
        if (initialServiceId) loadAvailability(initialServiceId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A failed request usually means the time was just taken: refresh the open times.
    useEffect(() => {
        if (state.error && serviceId) {
            startLoading(async () => setDays((await fetchAvailability(serviceId)) || []));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    function chooseService(id) {
        setServiceId(id);
        loadAvailability(id);
    }

    if (state.success) {
        return (
            <section className={classes.done}>
                <div className={classes.doneIcon} aria-hidden="true">✓</div>
                <h2>Request sent</h2>
                <p>
                    <strong>{state.booking.serviceName}</strong> on{' '}
                    {formatDateStr(date, { weekday: 'long', day: 'numeric', month: 'long' })} at {slot?.time}.
                </p>
                <p>This time is not confirmed yet. We have emailed you a copy and will email again once it is approved.</p>
                <div className={classes.doneActions}>
                    <Link href="/bookings" className={classes.primaryBtn}>View my bookings</Link>
                    <Link href="/" className={classes.ghostBtn}>Back to home</Link>
                </div>
            </section>
        );
    }

    const monthIndex = months.indexOf(month);

    return (
        <div className={classes.flow}>
            {/* 1. Service */}
            <section className={classes.step}>
                <h2><span className={classes.stepNum}>1</span> Choose a service</h2>
                <div className={classes.services}>
                    {services.map((s) => (
                        <button
                            key={s._id}
                            type="button"
                            className={`${classes.serviceCard} ${s._id === serviceId ? classes.selected : ''}`}
                            onClick={() => chooseService(s._id)}
                            aria-pressed={s._id === serviceId}
                        >
                            <span className={classes.serviceName}>{s.name}</span>
                            <span className={classes.serviceMeta}>
                                {formatDuration(s.durationMinutes)}{s.price ? ` · ${s.price}` : ''}
                            </span>
                            {s.description && <span className={classes.serviceDesc}>{s.description}</span>}
                        </button>
                    ))}
                </div>
            </section>

            {/* 2. Date */}
            {service && (
                <section className={classes.step}>
                    <h2><span className={classes.stepNum}>2</span> Pick a day</h2>
                    {loading && !days ? (
                        <p className={classes.muted}>Checking open times…</p>
                    ) : days && days.length === 0 ? (
                        <p className={classes.muted}>There are no open times for this service right now. Please check back soon.</p>
                    ) : days && month ? (
                        <div className={classes.calendar}>
                            <div className={classes.calHead}>
                                <button type="button" onClick={() => setMonth(months[monthIndex - 1])} disabled={monthIndex <= 0} aria-label="Previous month">‹</button>
                                <span>{formatDateStr(`${month}-01`, { month: 'long', year: 'numeric' })}</span>
                                <button type="button" onClick={() => setMonth(months[monthIndex + 1])} disabled={monthIndex >= months.length - 1} aria-label="Next month">›</button>
                            </div>
                            <div className={classes.calGrid}>
                                {WEEK_HEAD.map((d) => <span key={d} className={classes.calDow}>{d}</span>)}
                                {monthCells(month).map((d, i) => {
                                    if (!d) return <span key={`pad-${i}`} />;
                                    const open = byDate.has(d);
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            disabled={!open}
                                            className={`${classes.calDay} ${open ? classes.open : ''} ${d === date ? classes.selected : ''}`}
                                            onClick={() => { setDate(d); setSlot(null); }}
                                            aria-label={formatDateStr(d, { weekday: 'long', day: 'numeric', month: 'long' }) + (open ? '' : ', unavailable')}
                                        >
                                            {Number(d.slice(8))}
                                        </button>
                                    );
                                })}
                            </div>
                            {months.length > 1 && monthIndex < months.length - 1 && (
                                <button type="button" className={classes.linkBtn} onClick={() => setMonth(months[monthIndex + 1])}>
                                    More dates in {formatDateStr(`${months[monthIndex + 1]}-01`, { month: 'long' })} →
                                </button>
                            )}
                        </div>
                    ) : null}
                </section>
            )}

            {/* 3. Time */}
            {service && date && byDate.has(date) && (
                <section className={classes.step}>
                    <h2><span className={classes.stepNum}>3</span> Pick a time</h2>
                    <p className={classes.muted}>
                        {formatDateStr(date, { weekday: 'long', day: 'numeric', month: 'long' })} · {site.timeZoneLabel}
                    </p>
                    <div className={classes.slots}>
                        {byDate.get(date).map((s) => (
                            <button
                                key={s.start}
                                type="button"
                                className={`${classes.slot} ${slot?.start === s.start ? classes.selected : ''}`}
                                onClick={() => setSlot(s)}
                                aria-pressed={slot?.start === s.start}
                            >
                                {s.time}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* 4. Confirm */}
            {service && slot && (
                <section className={classes.step}>
                    <h2><span className={classes.stepNum}>4</span> Send your request</h2>
                    <div className={classes.summary}>
                        <strong>{service.name}</strong>
                        <span>{formatDateStr(date, { weekday: 'long', day: 'numeric', month: 'long' })} at {slot.time}</span>
                        <span className={classes.muted}>{formatDuration(service.durationMinutes)}{service.price ? ` · ${service.price}` : ''}</span>
                    </div>

                    {!viewer.signedIn ? (
                        <div className={classes.notice}>
                            <p>Please sign in or create an account to request this time.</p>
                            <div className={classes.doneActions}>
                                <Link href="/auth/signin?callbackUrl=/book" className={classes.primaryBtn}>Sign in</Link>
                                <Link href="/auth/register?callbackUrl=/book" className={classes.ghostBtn}>Create account</Link>
                            </div>
                        </div>
                    ) : !viewer.canBook ? (
                        <div className={classes.notice}>
                            <p>
                                {viewer.status === 'pending'
                                    ? 'Your account is still awaiting approval. You can request bookings as soon as it is approved, and we will email you when it is.'
                                    : 'Your account is not active, so bookings are unavailable. Please get in touch.'}
                            </p>
                        </div>
                    ) : (
                        <form action={formAction} className={classes.form}>
                            <input type="hidden" name="serviceId" value={service._id} />
                            <input type="hidden" name="start" value={slot.start} />
                            <label className={classes.field}>
                                <span>Phone number</span>
                                <input type="tel" name="phone" defaultValue={viewer.phone} autoComplete="tel" required />
                            </label>
                            <label className={classes.field}>
                                <span>Anything we should know? (optional)</span>
                                <textarea name="note" rows={3} placeholder="e.g. the occasion, skin concerns, number of people" />
                            </label>
                            {state.error && <p className={classes.error} role="alert">{state.error}</p>}
                            <SubmitButton />
                        </form>
                    )}
                </section>
            )}
        </div>
    );
}
