// Date and time helpers pinned to the business time zone. Servers (Netlify) run in UTC
// and visitors can be anywhere, so every wall-clock value goes through these.
import { site } from '@/lib/site';

export const TIME_ZONE = site.timeZone;

const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
});

function zonedParts(date) {
    const out = {};
    for (const p of partsFormatter.formatToParts(date)) out[p.type] = p.value;
    return {
        date: `${out.year}-${out.month}-${out.day}`,
        minutes: Number(out.hour) * 60 + Number(out.minute),
    };
}

// "HH:MM" -> minutes since midnight
export function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

// minutes since midnight -> "HH:MM"
export function fromMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isValidTime(s) {
    return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function isValidDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

// Wall-clock date + minutes in the business zone -> UTC Date.
export function zonedToUtc(dateStr, minutes) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const guess = Date.UTC(y, mo - 1, d, 0, minutes);
    // Offset of the zone at that moment, then correct the guess by it.
    const p = zonedParts(new Date(guess));
    const [py, pmo, pd] = p.date.split('-').map(Number);
    const offset = Date.UTC(py, pmo - 1, pd, 0, p.minutes) - guess;
    return new Date(guess - offset);
}

// UTC Date -> { date: 'YYYY-MM-DD', minutes } in the business zone.
export function utcToZoned(date) {
    return zonedParts(new Date(date));
}

export function todayInZone() {
    return zonedParts(new Date()).date;
}

export function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// 0 = Sunday
export function weekdayOf(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDate(date) {
    return new Intl.DateTimeFormat('en-ZA', {
        timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(date));
}

export function formatTime(date) {
    return new Intl.DateTimeFormat('en-ZA', {
        timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(date));
}

// "YYYY-MM-DD" -> "Tue 14 Oct"
export function formatDateStr(dateStr, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-ZA', { timeZone: 'UTC', ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDuration(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
}
