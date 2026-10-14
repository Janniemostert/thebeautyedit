// Read-side helpers for services, the schedule and availability (plain module, not a server action file).
import { connectDB } from '@/lib/db';
import Service from '@/lib/models/Service';
import Schedule from '@/lib/models/Schedule';
import Booking from '@/lib/models/Booking';
import { todayInZone, addDays, weekdayOf, toMinutes, fromMinutes, zonedToUtc } from '@/lib/time';

// Used the first time the schedule is opened. Elton changes it in Admin → Schedule.
const DEFAULT_WEEKLY = [
    { day: 0, ranges: [] },
    { day: 1, ranges: [{ start: '09:00', end: '17:00' }] },
    { day: 2, ranges: [{ start: '09:00', end: '17:00' }] },
    { day: 3, ranges: [{ start: '09:00', end: '17:00' }] },
    { day: 4, ranges: [{ start: '09:00', end: '17:00' }] },
    { day: 5, ranges: [{ start: '09:00', end: '17:00' }] },
    { day: 6, ranges: [{ start: '09:00', end: '13:00' }] },
];

export function serializeService(doc) {
    return {
        _id:             doc._id.toString(),
        name:            doc.name,
        description:     doc.description || '',
        durationMinutes: doc.durationMinutes,
        price:           doc.price || '',
        active:          !!doc.active,
        order:           doc.order || 0,
    };
}

function serializeRanges(ranges = []) {
    return ranges.map((r) => ({ start: r.start, end: r.end }));
}

export function serializeSchedule(doc) {
    const weekly = [0, 1, 2, 3, 4, 5, 6].map((day) => {
        const w = (doc.weekly || []).find((x) => x.day === day);
        return { day, ranges: serializeRanges(w?.ranges) };
    });
    return {
        weekly,
        slotStep:       doc.slotStep,
        bufferMinutes:  doc.bufferMinutes,
        minNoticeHours: doc.minNoticeHours,
        maxAdvanceDays: doc.maxAdvanceDays,
        overrides: (doc.overrides || [])
            .map((o) => ({ _id: o._id.toString(), date: o.date, ranges: serializeRanges(o.ranges), note: o.note || '' }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        blocks: (doc.blocks || [])
            .map((b) => ({
                _id: b._id.toString(), startDate: b.startDate, endDate: b.endDate,
                startTime: b.startTime || null, endTime: b.endTime || null, reason: b.reason || '',
            }))
            .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    };
}

export function serializeBooking(doc) {
    return {
        _id:             doc._id.toString(),
        user:            doc.user ? doc.user.toString() : null,
        clientName:      doc.clientName,
        clientEmail:     doc.clientEmail || '',
        clientPhone:     doc.clientPhone || '',
        service:         doc.service ? doc.service.toString() : null,
        serviceName:     doc.serviceName,
        durationMinutes: doc.durationMinutes,
        start:           new Date(doc.start).toISOString(),
        end:             new Date(doc.end).toISOString(),
        status:          doc.status,
        clientNote:      doc.clientNote || '',
        adminNote:       doc.adminNote || '',
        createdBy:       doc.createdBy || 'client',
        createdAt:       doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    };
}

export async function getScheduleDoc() {
    await connectDB();
    let doc = await Schedule.findOne();
    if (!doc) doc = await Schedule.create({ weekly: DEFAULT_WEEKLY });
    return doc;
}

export async function getSchedule() {
    return serializeSchedule(await getScheduleDoc());
}

export async function getServices({ includeInactive = false } = {}) {
    await connectDB();
    const query = includeInactive ? {} : { active: true };
    const docs = await Service.find(query).sort({ order: 1, createdAt: 1 }).lean();
    return docs.map(serializeService);
}

// Approved bookings that could clash with anything from today onward.
export async function getBusyTimes({ excludeId = null } = {}) {
    await connectDB();
    const query = { status: 'approved', end: { $gte: zonedToUtc(todayInZone(), 0) } };
    if (excludeId) query._id = { $ne: excludeId };
    const docs = await Booking.find(query).select('start end').lean();
    return docs.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }));
}

// Opening hours for one date: a date override wins over the weekly hours.
function rangesFor(schedule, date) {
    const override = schedule.overrides.find((o) => o.date === date);
    if (override) return override.ranges;
    return schedule.weekly.find((w) => w.day === weekdayOf(date))?.ranges || [];
}

// Blocked windows on one date, in minutes since midnight.
function blocksFor(schedule, date) {
    return schedule.blocks
        .filter((b) => b.startDate <= date && date <= b.endDate)
        .map((b) => (b.startTime && b.endTime ? [toMinutes(b.startTime), toMinutes(b.endTime)] : [0, 24 * 60]));
}

// Free start times on one date for an appointment of `durationMinutes`.
// `busy` is a list of { start, end } in ms (approved bookings).
export function slotsForDate(schedule, date, durationMinutes, busy, now = Date.now()) {
    const step    = Math.max(5, schedule.slotStep || 30);
    const buffer  = (schedule.bufferMinutes || 0) * 60000;
    const earliest = now + (schedule.minNoticeHours || 0) * 3600000;
    const blocked = blocksFor(schedule, date);
    const seen    = new Set();
    const slots   = [];

    for (const r of rangesFor(schedule, date)) {
        const rs = toMinutes(r.start);
        const re = toMinutes(r.end);
        for (let t = rs; t + durationMinutes <= re; t += step) {
            if (seen.has(t)) continue;
            if (blocked.some(([bs, be]) => t < be && t + durationMinutes > bs)) continue;
            const start = zonedToUtc(date, t).getTime();
            const end   = start + durationMinutes * 60000;
            if (start < earliest) continue;
            if (busy.some((b) => b.start < end + buffer && b.end + buffer > start)) continue;
            seen.add(t);
            slots.push({ start: new Date(start).toISOString(), time: fromMinutes(t), minutes: t });
        }
    }
    return slots.sort((a, b) => a.minutes - b.minutes).map(({ start, time }) => ({ start, time }));
}

// Every bookable date in the advance window with its free start times.
export function computeAvailability(schedule, durationMinutes, busy, now = Date.now()) {
    const today = todayInZone();
    const days = [];
    for (let i = 0; i <= schedule.maxAdvanceDays; i++) {
        const date  = addDays(today, i);
        const slots = slotsForDate(schedule, date, durationMinutes, busy, now);
        if (slots.length) days.push({ date, slots });
    }
    return days;
}

export async function getAvailability(serviceId) {
    await connectDB();
    const service = await Service.findOne({ _id: serviceId, active: true }).lean();
    if (!service) return null;
    const [schedule, busy] = await Promise.all([getSchedule(), getBusyTimes()]);
    return computeAvailability(schedule, service.durationMinutes, busy);
}
