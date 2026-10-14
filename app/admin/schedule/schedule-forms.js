'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveWeeklySchedule, addOverride, addBlock } from '@/lib/scheduleActions';
import { WEEKDAYS } from '@/lib/time';
import classes from '../admin.module.css';
import own from '../bookings/bookings.module.css';
import s from './schedule.module.css';

// Monday first, the way people read a week.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function Submit({ children, busyText = 'Saving…' }) {
    const { pending } = useFormStatus();
    return <button type="submit" className={own.submitBtn} disabled={pending}>{pending ? busyText : children}</button>;
}

function Feedback({ state, okText = 'Saved.' }) {
    if (state.error) return <p className={own.error}>{state.error}</p>;
    if (state.success) return <p className={own.ok}>{okText}</p>;
    return null;
}

// Editable list of { start, end } time ranges.
function RangesEditor({ ranges, onChange }) {
    const update = (i, key, value) => onChange(ranges.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
    const remove = (i) => onChange(ranges.filter((_, j) => j !== i));
    const add = () => {
        const last = ranges[ranges.length - 1];
        onChange([...ranges, last ? { start: last.end, end: last.end < '17:00' ? '17:00' : last.end } : { start: '09:00', end: '17:00' }]);
    };

    return (
        <div className={s.ranges}>
            {ranges.map((r, i) => (
                <div key={i} className={`${own.inline} ${s.range}`}>
                    <input type="time" value={r.start} step={300} onChange={(e) => update(i, 'start', e.target.value)} aria-label="From" required />
                    <span className={classes.muted}>to</span>
                    <input type="time" value={r.end} step={300} onChange={(e) => update(i, 'end', e.target.value)} aria-label="Until" required />
                    <button type="button" className={s.iconBtn} onClick={() => remove(i)} aria-label="Remove time range">×</button>
                </div>
            ))}
            <button type="button" className={s.addBtn} onClick={add}>+ Add hours</button>
        </div>
    );
}

export function WeeklyHoursForm({ schedule }) {
    const [weekly, setWeekly] = useState(schedule.weekly);
    const [state, formAction] = useFormState(saveWeeklySchedule, {});

    const setRanges = (day, ranges) => setWeekly((w) => w.map((d) => (d.day === day ? { ...d, ranges } : d)));

    return (
        <form action={formAction} className={s.panel}>
            <input type="hidden" name="weekly" value={JSON.stringify(weekly)} />

            <div className={s.week}>
                {DAY_ORDER.map((day) => {
                    const d = weekly.find((w) => w.day === day);
                    const open = d.ranges.length > 0;
                    return (
                        <div key={day} className={s.dayRow}>
                            <label className={s.dayToggle}>
                                <input
                                    type="checkbox"
                                    checked={open}
                                    onChange={(e) => setRanges(day, e.target.checked ? [{ start: '09:00', end: '17:00' }] : [])}
                                />
                                <span>{WEEKDAYS[day]}</span>
                            </label>
                            {open ? <RangesEditor ranges={d.ranges} onChange={(r) => setRanges(day, r)} /> : <span className={classes.muted}>Closed</span>}
                        </div>
                    );
                })}
            </div>

            <div className={s.rules}>
                <label>
                    <span>Offer a start time every</span>
                    <select name="slotStep" defaultValue={schedule.slotStep}>
                        {[15, 20, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n} minutes</option>)}
                    </select>
                </label>
                <label>
                    <span>Break after each appointment</span>
                    <select name="bufferMinutes" defaultValue={schedule.bufferMinutes}>
                        {[0, 5, 10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n ? `${n} minutes` : 'None'}</option>)}
                    </select>
                </label>
                <label>
                    <span>Minimum notice (hours)</span>
                    <input type="number" name="minNoticeHours" min={0} max={720} defaultValue={schedule.minNoticeHours} />
                </label>
                <label>
                    <span>Bookable up to (days ahead)</span>
                    <input type="number" name="maxAdvanceDays" min={1} max={365} defaultValue={schedule.maxAdvanceDays} />
                </label>
            </div>

            <div className={s.footer}>
                <Submit>Save weekly hours</Submit>
                <Feedback state={state} />
            </div>
        </form>
    );
}

export function OverrideForm() {
    const [state, formAction] = useFormState(addOverride, {});
    const [closed, setClosed] = useState(false);
    const [ranges, setRanges] = useState([{ start: '09:00', end: '17:00' }]);
    const formRef = useRef(null);

    useEffect(() => {
        if (!state.success) return;
        formRef.current?.reset();
        setClosed(false);
        setRanges([{ start: '09:00', end: '17:00' }]);
    }, [state]);

    return (
        <form ref={formRef} action={formAction} className={s.panel}>
            <input type="hidden" name="ranges" value={JSON.stringify(ranges)} />
            <div className={s.formRow}>
                <label>
                    <span>Date</span>
                    <input type="date" name="date" required />
                </label>
                <label className={own.check}>
                    <input type="checkbox" name="closed" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
                    Closed all day
                </label>
            </div>
            {!closed && (
                <div>
                    <span className={s.label}>Open hours on this date</span>
                    <RangesEditor ranges={ranges} onChange={setRanges} />
                </div>
            )}
            <label className={s.noteField}>
                <span>Note (only you see this)</span>
                <input type="text" name="note" placeholder="e.g. Heritage Day" />
            </label>
            <div className={s.footer}>
                <Submit>Save special hours</Submit>
                <Feedback state={state} />
            </div>
        </form>
    );
}

export function BlockForm() {
    const [state, formAction] = useFormState(addBlock, {});
    const [allDay, setAllDay] = useState(true);
    const formRef = useRef(null);

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            setAllDay(true);
        }
    }, [state]);

    return (
        <form ref={formRef} action={formAction} className={s.panel}>
            <div className={s.formRow}>
                <label>
                    <span>From date</span>
                    <input type="date" name="startDate" required />
                </label>
                <label>
                    <span>To date (inclusive)</span>
                    <input type="date" name="endDate" />
                </label>
                <label className={own.check}>
                    <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                    All day
                </label>
                {!allDay && (
                    <>
                        <label>
                            <span>From</span>
                            <input type="time" name="startTime" step={300} required />
                        </label>
                        <label>
                            <span>Until</span>
                            <input type="time" name="endTime" step={300} required />
                        </label>
                    </>
                )}
            </div>
            <label className={s.noteField}>
                <span>Reason (only you see this)</span>
                <input type="text" name="reason" placeholder="e.g. Leave, wedding shoot" />
            </label>
            <div className={s.footer}>
                <Submit>Block</Submit>
                <Feedback state={state} okText="Blocked." />
            </div>
        </form>
    );
}
