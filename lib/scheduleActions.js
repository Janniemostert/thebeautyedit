'use server';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import Service from '@/lib/models/Service';
import { requireAdmin } from '@/lib/authz';
import { getScheduleDoc } from '@/lib/booking';
import { isValidDate, isValidTime, toMinutes } from '@/lib/time';

const clean = (v, max = 1000) => String(v ?? '').trim().slice(0, max);

function revalidateSchedule() {
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/services');
    revalidatePath('/book');
    revalidatePath('/');
}

// Checks a list of { start, end } ranges. Returns an error message or null.
function checkRanges(ranges, label) {
    if (!Array.isArray(ranges)) return `${label}: invalid hours.`;
    for (const r of ranges) {
        if (!isValidTime(r.start) || !isValidTime(r.end)) return `${label}: times must be HH:MM.`;
        if (toMinutes(r.start) >= toMinutes(r.end)) return `${label}: each start time must be before its end time.`;
    }
    return null;
}

const toInt = (v, min, max, fallback) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Schedule ────────────────────────────────────────────────

export async function saveWeeklySchedule(prevState, formData) {
    await requireAdmin();

    let weekly;
    try {
        weekly = JSON.parse(formData.get('weekly') || '[]');
    } catch {
        return { error: 'Could not read the weekly hours.' };
    }
    if (!Array.isArray(weekly)) return { error: 'Could not read the weekly hours.' };
    weekly = weekly.filter((w) => Number.isInteger(w?.day) && w.day >= 0 && w.day <= 6);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const w of weekly) {
        const err = checkRanges(w.ranges, days[w.day] || 'Day');
        if (err) return { error: err };
    }

    const doc = await getScheduleDoc();
    doc.weekly = weekly.map((w) => ({ day: w.day, ranges: w.ranges.map((r) => ({ start: r.start, end: r.end })) }));
    doc.slotStep       = toInt(formData.get('slotStep'), 5, 240, 30);
    doc.bufferMinutes  = toInt(formData.get('bufferMinutes'), 0, 240, 0);
    doc.minNoticeHours = toInt(formData.get('minNoticeHours'), 0, 24 * 30, 24);
    doc.maxAdvanceDays = toInt(formData.get('maxAdvanceDays'), 1, 365, 60);
    await doc.save();

    revalidateSchedule();
    return { success: true, savedAt: Date.now() };
}

export async function addOverride(prevState, formData) {
    await requireAdmin();
    const date   = formData.get('date');
    const closed = formData.get('closed') === 'on';
    const note   = clean(formData.get('note'), 200);

    let ranges = [];
    try {
        ranges = closed ? [] : JSON.parse(formData.get('ranges') || '[]');
    } catch {
        return { error: 'Could not read the hours.' };
    }

    if (!isValidDate(date)) return { error: 'Choose a date.' };
    if (!closed && !ranges.length) return { error: 'Add at least one time range, or tick "Closed all day".' };
    const err = checkRanges(ranges, 'Hours');
    if (err) return { error: err };

    const doc = await getScheduleDoc();
    // One override per date: replace any existing one.
    doc.overrides = doc.overrides.filter((o) => o.date !== date);
    doc.overrides.push({ date, ranges, note });
    await doc.save();

    revalidateSchedule();
    return { success: true, savedAt: Date.now() };
}

export async function deleteOverride(formData) {
    await requireAdmin();
    const doc = await getScheduleDoc();
    doc.overrides = doc.overrides.filter((o) => o._id.toString() !== formData.get('id'));
    await doc.save();
    revalidateSchedule();
}

export async function addBlock(prevState, formData) {
    await requireAdmin();
    const startDate = formData.get('startDate');
    const endDate   = formData.get('endDate') || startDate;
    const allDay    = formData.get('allDay') === 'on';
    const startTime = allDay ? null : formData.get('startTime');
    const endTime   = allDay ? null : formData.get('endTime');
    const reason    = clean(formData.get('reason'), 200);

    if (!isValidDate(startDate) || !isValidDate(endDate)) return { error: 'Choose the dates to block.' };
    if (endDate < startDate) return { error: 'The end date is before the start date.' };
    if (!allDay) {
        if (!isValidTime(startTime) || !isValidTime(endTime)) return { error: 'Enter the hours to block, or tick "All day".' };
        if (toMinutes(startTime) >= toMinutes(endTime)) return { error: 'The block start time must be before its end time.' };
    }

    const doc = await getScheduleDoc();
    doc.blocks.push({ startDate, endDate, startTime, endTime, reason });
    await doc.save();

    revalidateSchedule();
    return { success: true, savedAt: Date.now() };
}

export async function deleteBlock(formData) {
    await requireAdmin();
    const doc = await getScheduleDoc();
    doc.blocks = doc.blocks.filter((b) => b._id.toString() !== formData.get('id'));
    await doc.save();
    revalidateSchedule();
}

// ── Services ────────────────────────────────────────────────

export async function saveService(prevState, formData) {
    await requireAdmin();
    const id              = formData.get('id');
    const name            = clean(formData.get('name'), 120);
    const description     = clean(formData.get('description'), 1000);
    const price           = clean(formData.get('price'), 60);
    const durationMinutes = Math.round(Number(formData.get('durationMinutes')));
    const order           = Math.round(Number(formData.get('order'))) || 0;

    if (!name) return { error: 'Enter a service name.' };
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 24 * 60) {
        return { error: 'Duration must be between 5 minutes and 24 hours.' };
    }

    await connectDB();
    const data = { name, description, price, durationMinutes, order };
    if (id) {
        if (!mongoose.isValidObjectId(id)) return { error: 'Service not found.' };
        await Service.findByIdAndUpdate(id, data);
        revalidateSchedule();
        redirect('/admin/services');
    } else {
        await Service.create(data);
    }

    revalidateSchedule();
    return { success: true, savedAt: Date.now() };
}

export async function toggleServiceActive(formData) {
    await requireAdmin();
    const id = formData.get('id');
    if (!mongoose.isValidObjectId(id)) return;
    await connectDB();
    const service = await Service.findById(id);
    if (!service) return;
    service.active = !service.active;
    await service.save();
    revalidateSchedule();
}

// Existing bookings keep their own copy of the service name and duration, so deleting is safe.
export async function deleteService(formData) {
    await requireAdmin();
    const id = formData.get('id');
    if (!mongoose.isValidObjectId(id)) return;
    await connectDB();
    await Service.findByIdAndDelete(id);
    revalidateSchedule();
}
