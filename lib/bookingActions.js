'use server';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Service from '@/lib/models/Service';
import User from '@/lib/models/User';
import { requireAdmin, getNotifyEmails } from '@/lib/authz';
import { getAvailability, getSchedule, getBusyTimes, slotsForDate, serializeBooking } from '@/lib/booking';
import { sendEmail, describeBooking, bookingIcs, siteUrl } from '@/lib/email';
import { utcToZoned, zonedToUtc, isValidDate, isValidTime, toMinutes } from '@/lib/time';

const clean = (v, max = 1000) => String(v ?? '').trim().slice(0, max);

function revalidateBookings() {
    revalidatePath('/admin/bookings');
    revalidatePath('/bookings');
    revalidatePath('/book');
}

// Approved bookings that overlap [start, end), ignoring `excludeId`.
async function findClash(start, end, excludeId = null) {
    const query = { status: 'approved', start: { $lt: end }, end: { $gt: start } };
    if (excludeId) query._id = { $ne: excludeId };
    return Booking.findOne(query).lean();
}

// ── Client side ─────────────────────────────────────────────

export async function fetchAvailability(serviceId) {
    if (!mongoose.isValidObjectId(serviceId)) return null;
    return getAvailability(serviceId);
}

export async function requestBooking(prevState, formData) {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Please sign in to request a booking.' };
    if (session.user.status !== 'active' && session.user.role !== 'admin') {
        return { error: 'Your account is still awaiting approval. You can request bookings once it is approved.' };
    }

    const serviceId = formData.get('serviceId');
    const startIso  = formData.get('start');
    const note      = clean(formData.get('note'));
    const phone     = clean(formData.get('phone'), 40);

    if (!mongoose.isValidObjectId(serviceId) || !startIso) return { error: 'Please choose a service, date and time.' };
    if (!phone) return { error: 'Please add a phone number so we can reach you.' };

    await connectDB();
    const service = await Service.findOne({ _id: serviceId, active: true }).lean();
    if (!service) return { error: 'That service is no longer available.' };

    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return { error: 'Invalid time.' };

    // The time must still be one of the offered slots (it may have been taken meanwhile).
    const [schedule, busy] = await Promise.all([getSchedule(), getBusyTimes()]);
    const { date } = utcToZoned(start);
    const free = slotsForDate(schedule, date, service.durationMinutes, busy);
    if (!free.some((s) => s.start === start.toISOString())) {
        return { error: 'Sorry, that time is no longer available. Please pick another.' };
    }

    const end  = new Date(start.getTime() + service.durationMinutes * 60000);
    const user = await User.findById(session.user.id);
    if (!user) return { error: 'Account not found.' };

    const duplicate = await Booking.exists({
        user: user._id, status: { $in: ['pending', 'approved'] }, start: { $lt: end }, end: { $gt: start },
    });
    if (duplicate) return { error: 'You already have a booking or request at that time.' };

    if (phone !== user.phone) {
        user.phone = phone;
        await user.save();
    }

    const booking = await Booking.create({
        user:            user._id,
        clientName:      user.name,
        clientEmail:     user.email,
        clientPhone:     phone,
        service:         service._id,
        serviceName:     service.name,
        durationMinutes: service.durationMinutes,
        start,
        end,
        clientNote:      note,
        status:          'pending',
    });

    const details = describeBooking(booking);
    await Promise.all([
        sendEmail({
            to: getNotifyEmails(),
            subject: `New booking request: ${user.name}`,
            heading: 'New booking request',
            lines: [
                `${user.name} has requested an appointment.`,
                details,
                `Email: ${user.email}\nPhone: ${phone}`,
                note ? `Note from client: ${note}` : '',
            ].filter(Boolean),
            button: { label: 'Review in admin', href: `${siteUrl()}/admin/bookings` },
        }),
        sendEmail({
            to: user.email,
            subject: 'We received your booking request',
            heading: 'Booking request received',
            lines: [
                `Hi ${user.name.split(' ')[0]}, thanks for your request.`,
                details,
                'This time is not confirmed yet. You will get another email as soon as it is approved.',
            ],
            button: { label: 'View my bookings', href: `${siteUrl()}/bookings` },
        }),
    ]);

    revalidateBookings();
    return { success: true, booking: serializeBooking(booking) };
}

export async function cancelMyBooking(prevState, formData) {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Not signed in.' };

    const id = formData.get('bookingId');
    if (!mongoose.isValidObjectId(id)) return { error: 'Booking not found.' };

    await connectDB();
    const booking = await Booking.findOne({ _id: id, user: session.user.id });
    if (!booking) return { error: 'Booking not found.' };
    if (!['pending', 'approved'].includes(booking.status)) return { error: 'This booking can no longer be cancelled.' };
    if (booking.start <= new Date()) return { error: 'This appointment has already started.' };

    const wasApproved = booking.status === 'approved';
    booking.status = 'cancelled';
    booking.decidedAt = new Date();
    await booking.save();

    await sendEmail({
        to: getNotifyEmails(),
        subject: `Booking cancelled by ${booking.clientName}`,
        heading: wasApproved ? 'A confirmed appointment was cancelled' : 'A booking request was withdrawn',
        lines: [`${booking.clientName} cancelled:`, describeBooking(booking), wasApproved ? 'The time is open again.' : ''].filter(Boolean),
        button: { label: 'Open bookings', href: `${siteUrl()}/admin/bookings` },
    });

    revalidateBookings();
    return { success: true };
}

// ── Admin side ──────────────────────────────────────────────

export async function approveBooking(prevState, formData) {
    await requireAdmin();
    const id = formData.get('bookingId');
    if (!mongoose.isValidObjectId(id)) return { error: 'Booking not found.' };

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking || booking.status !== 'pending') return { error: 'This request is no longer pending.' };

    const clash = await findClash(booking.start, booking.end, booking._id);
    if (clash) return { error: `Clashes with ${clash.clientName}'s confirmed ${clash.serviceName}. Decline this one or cancel the other first.` };

    booking.status = 'approved';
    booking.decidedAt = new Date();
    await booking.save();

    await sendEmail({
        to: booking.clientEmail,
        subject: 'Your appointment is confirmed',
        heading: 'Appointment confirmed',
        lines: [
            `Hi ${booking.clientName.split(' ')[0]}, your appointment is confirmed.`,
            describeBooking(booking),
            'The attached calendar file adds it to your calendar. If you need to cancel, please do so from your bookings page.',
        ],
        button: { label: 'View my bookings', href: `${siteUrl()}/bookings` },
        attachments: [bookingIcs(booking)],
    });

    // The time is now taken: decline other pending requests that overlap it.
    const overlapping = await Booking.find({
        _id: { $ne: booking._id }, status: 'pending', start: { $lt: booking.end }, end: { $gt: booking.start },
    });
    for (const other of overlapping) {
        other.status = 'declined';
        other.adminNote = 'That time has just been booked by someone else.';
        other.decidedAt = new Date();
        await other.save();
        await sendEmail({
            to: other.clientEmail,
            subject: 'Your requested time is no longer available',
            heading: 'Please choose another time',
            lines: [
                `Hi ${other.clientName.split(' ')[0]}, unfortunately the time you requested has just been booked:`,
                describeBooking(other),
                'Please pick another time that suits you.',
            ],
            button: { label: 'Choose another time', href: `${siteUrl()}/book` },
        });
    }

    revalidateBookings();
    return { success: true, autoDeclined: overlapping.length };
}

export async function declineBooking(prevState, formData) {
    await requireAdmin();
    const id     = formData.get('bookingId');
    const reason = clean(formData.get('reason'), 500);
    if (!mongoose.isValidObjectId(id)) return { error: 'Booking not found.' };

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking || booking.status !== 'pending') return { error: 'This request is no longer pending.' };

    booking.status = 'declined';
    booking.adminNote = reason;
    booking.decidedAt = new Date();
    await booking.save();

    await sendEmail({
        to: booking.clientEmail,
        subject: 'About your booking request',
        heading: 'Booking request not available',
        lines: [
            `Hi ${booking.clientName.split(' ')[0]}, unfortunately we can't take this booking:`,
            describeBooking(booking),
            reason ? `Message: ${reason}` : '',
            'Feel free to request another time.',
        ].filter(Boolean),
        button: { label: 'Choose another time', href: `${siteUrl()}/book` },
    });

    revalidateBookings();
    return { success: true };
}

export async function adminCancelBooking(prevState, formData) {
    await requireAdmin();
    const id     = formData.get('bookingId');
    const reason = clean(formData.get('reason'), 500);
    const notify = formData.get('notify') === 'on';
    if (!mongoose.isValidObjectId(id)) return { error: 'Booking not found.' };

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking || booking.status !== 'approved') return { error: 'Only confirmed bookings can be cancelled.' };

    booking.status = 'cancelled';
    booking.adminNote = reason;
    booking.decidedAt = new Date();
    await booking.save();

    if (notify) {
        await sendEmail({
            to: booking.clientEmail,
            subject: 'Your appointment has been cancelled',
            heading: 'Appointment cancelled',
            lines: [
                `Hi ${booking.clientName.split(' ')[0]}, we're sorry, but this appointment has been cancelled:`,
                describeBooking(booking),
                reason ? `Message: ${reason}` : '',
                'Please choose a new time that suits you.',
            ].filter(Boolean),
            button: { label: 'Book a new time', href: `${siteUrl()}/book` },
        });
    }

    revalidateBookings();
    return { success: true };
}

// Elton adds a booking himself (phone, WhatsApp, walk-in). It is confirmed straight away.
export async function createAdminBooking(prevState, formData) {
    await requireAdmin();

    const serviceId  = formData.get('serviceId');
    const date       = formData.get('date');
    const time       = formData.get('time');
    const clientName = clean(formData.get('clientName'), 120);
    const email      = clean(formData.get('clientEmail'), 200).toLowerCase();
    const phone      = clean(formData.get('clientPhone'), 40);
    const note       = clean(formData.get('note'));
    const notify     = formData.get('notify') === 'on';
    const customDur  = Number(formData.get('durationMinutes')) || 0;

    if (!mongoose.isValidObjectId(serviceId)) return { error: 'Choose a service.' };
    if (!isValidDate(date) || !isValidTime(time)) return { error: 'Choose a valid date and time.' };
    if (!clientName) return { error: "Enter the client's name." };

    await connectDB();
    const service = await Service.findById(serviceId).lean();
    if (!service) return { error: 'Service not found.' };

    const duration = customDur >= 5 ? customDur : service.durationMinutes;
    const start = zonedToUtc(date, toMinutes(time));
    const end   = new Date(start.getTime() + duration * 60000);

    const clash = await findClash(start, end);
    if (clash) return { error: `Clashes with ${clash.clientName}'s confirmed ${clash.serviceName}.` };

    const user = email ? await User.findOne({ email }).select('_id').lean() : null;

    const booking = await Booking.create({
        user:            user?._id || null,
        clientName,
        clientEmail:     email,
        clientPhone:     phone,
        service:         service._id,
        serviceName:     service.name,
        durationMinutes: duration,
        start,
        end,
        clientNote:      note,
        status:          'approved',
        createdBy:       'admin',
        decidedAt:       new Date(),
    });

    if (notify && email) {
        await sendEmail({
            to: email,
            subject: 'Your appointment is confirmed',
            heading: 'Appointment confirmed',
            lines: [`Hi ${clientName.split(' ')[0]}, your appointment is booked.`, describeBooking(booking)],
            attachments: [bookingIcs(booking)],
        });
    }

    revalidateBookings();
    return { success: true };
}
