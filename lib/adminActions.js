'use server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz';
import { sendEmail, siteUrl } from '@/lib/email';

export async function approveUser(formData) {
    await requireAdmin();
    await connectDB();
    const userId = formData.get('userId');
    const tier   = formData.get('tier');

    const now = new Date();
    const expiresAt = new Date(now);

    if (tier === '1month')   expiresAt.setMonth(expiresAt.getMonth() + 1);
    if (tier === '6months')  expiresAt.setMonth(expiresAt.getMonth() + 6);
    if (tier === '1year')    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    if (tier === 'lifetime') expiresAt.setFullYear(9999);

    const user = await User.findByIdAndUpdate(userId, {
        status:           'active',
        subscriptionTier: tier,
        accessGrantedAt:  now,
        accessExpiresAt:  expiresAt,
    });

    if (user) {
        await sendEmail({
            to: user.email,
            subject: 'Your account has been approved',
            heading: 'Welcome! Your account is active',
            lines: [
                `Hi ${user.name.split(' ')[0]}, your account has been approved.`,
                'You can now book appointments, comment and view members-only work.',
            ],
            button: { label: 'Book an appointment', href: `${siteUrl()}/book` },
        });
    }

    revalidatePath('/admin');
}

export async function updateUserStatus(formData) {
    await requireAdmin();
    await connectDB();
    const userId = formData.get('userId');
    const status = formData.get('status');
    await User.findByIdAndUpdate(userId, { status });
    revalidatePath('/admin');
}
