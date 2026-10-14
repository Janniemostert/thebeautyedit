'use server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { getAdminEmails, getNotifyEmails } from '@/lib/authz';
import { sendEmail, siteUrl } from '@/lib/email';

// Creates an email + password account. Like Google accounts it starts as "pending"
// until an admin approves it. The page signs the user in after this succeeds.
export async function registerUser(prevState, formData) {
    const name     = String(formData.get('name') || '').trim().slice(0, 120);
    const email    = String(formData.get('email') || '').trim().toLowerCase().slice(0, 200);
    const phone    = String(formData.get('phone') || '').trim().slice(0, 40);
    const password = String(formData.get('password') || '');
    const confirm  = String(formData.get('confirm') || '');

    if (!name) return { error: 'Please enter your name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
    if (password.length < 8) return { error: 'Your password must be at least 8 characters.' };
    if (password.length > 200) return { error: 'That password is too long.' };
    if (password !== confirm) return { error: 'The two passwords do not match.' };

    await connectDB();
    const existing = await User.findOne({ email }).select('+passwordHash').lean();
    if (existing) {
        // Never attach a password to an existing account: the email isn't verified, so that
        // would let anyone take over a Google account by registering with its address.
        return {
            error: existing.passwordHash
                ? 'An account with this email already exists. Please sign in instead.'
                : 'This email already signs in with Google. Please use "Continue with Google".',
        };
    }

    const isAdmin = getAdminEmails().includes(email);
    await User.create({
        name,
        email,
        phone,
        passwordHash:     await bcrypt.hash(password, 10),
        role:             isAdmin ? 'admin' : 'subscriber',
        status:           isAdmin ? 'active' : 'pending',
        accessGrantedAt:  isAdmin ? new Date() : null,
        subscriptionTier: isAdmin ? 'lifetime' : null,
    });

    if (!isAdmin) {
        await sendEmail({
            to: getNotifyEmails(),
            subject: `New account waiting for approval: ${name}`,
            heading: 'New account to approve',
            lines: [`${name} (${email}${phone ? `, ${phone}` : ''}) registered and is waiting for approval.`],
            button: { label: 'Review accounts', href: `${siteUrl()}/admin` },
        });
    }

    return { success: true };
}
