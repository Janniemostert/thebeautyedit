// Outgoing email through Gmail SMTP (Nodemailer). Needs GMAIL_USER and GMAIL_APP_PASSWORD.
// Without them (e.g. local testing) emails are printed to the server console instead.
// Sending never throws: a failed email must not undo a booking or approval.
import nodemailer from 'nodemailer';
import { site, SITE_URL } from '@/lib/site';
import { formatDate, formatTime, formatDuration } from '@/lib/time';

let transporter = null;

function getTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });
    }
    return transporter;
}

export function siteUrl() {
    return process.env.NODE_ENV === 'production' ? SITE_URL : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Simple branded wrapper. `lines` are plain-text paragraphs; `button` is { label, href }.
function layout({ heading, lines, button }) {
    const body = lines.map((l) => `<p style="margin:0 0 14px;line-height:1.6;color:#333">${escapeHtml(l).replace(/\n/g, '<br>')}</p>`).join('');
    const btn = button
        ? `<p style="margin:24px 0"><a href="${escapeHtml(button.href)}" style="background:#b85c7e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>`
        : '';
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:18px;font-weight:700;margin:0 0 20px;color:#b85c7e">${escapeHtml(site.fullName)}</p>
<h1 style="font-size:20px;margin:0 0 16px;color:#111">${escapeHtml(heading)}</h1>${body}${btn}
<p style="margin:28px 0 0;font-size:12px;color:#888">${escapeHtml(site.fullName)} · ${escapeHtml(siteUrl())}</p></div>`;
    const text = [heading, '', ...lines, button ? `\n${button.label}: ${button.href}` : ''].join('\n');
    return { html, text };
}

export async function sendEmail({ to, subject, heading, lines, button, attachments }) {
    const recipients = [].concat(to).filter(Boolean);
    if (!recipients.length) return;

    const { html, text } = layout({ heading: heading || subject, lines, button });
    const t = getTransporter();

    if (!t) {
        console.log(`\n[email not sent: GMAIL_USER / GMAIL_APP_PASSWORD not set]\nTo: ${recipients.join(', ')}\nSubject: ${subject}\n${text}\n`);
        return;
    }

    try {
        await t.sendMail({
            from: `"${site.fullName}" <${process.env.GMAIL_USER}>`,
            to: recipients.join(', '),
            subject,
            text,
            html,
            attachments,
        });
    } catch (err) {
        console.error('Email failed:', subject, err.message);
    }
}

export function describeBooking(b) {
    return `${b.serviceName} (${formatDuration(b.durationMinutes)})\n${formatDate(b.start)} at ${formatTime(b.start)}`;
}

// Calendar invite so the client can add the appointment with one tap.
export function bookingIcs(b) {
    const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${site.fullName}//Bookings//EN`, 'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${b._id}@${new URL(siteUrl()).hostname}`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(b.start)}`,
        `DTEND:${stamp(b.end)}`,
        `SUMMARY:${b.serviceName} – ${site.fullName}`,
        'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    return { filename: 'appointment.ics', content: ics, contentType: 'text/calendar' };
}
