'use server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import Booking from '@/lib/models/Booking';
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
                'You can now book appointments, comment and view members-only content.',
            ],
            button: { label: 'Book an appointment', href: `${siteUrl()}/book` },
        });
    }

    revalidatePath('/admin');
}

// Deletes a client account. Their upcoming bookings are cancelled (the times open up again);
// past bookings and comments stay for the record, shown under the name stored on them.
export async function deleteUser(formData) {
    const session = await requireAdmin();
    const userId  = formData.get('userId');
    if (!mongoose.isValidObjectId(userId) || userId === session.user.id) return;

    await connectDB();
    const user = await User.findById(userId);
    if (!user || user.role === 'admin') return;

    await Booking.updateMany(
        { user: user._id, status: { $in: ['pending', 'approved'] }, end: { $gte: new Date() } },
        { status: 'cancelled', adminNote: 'Account deleted', decidedAt: new Date() }
    );
    await user.deleteOne();

    revalidatePath('/admin');
    revalidatePath('/admin/bookings');
}

export async function updateUserStatus(formData) {
    await requireAdmin();
    await connectDB();
    const userId = formData.get('userId');
    const status = formData.get('status');
    await User.findByIdAndUpdate(userId, { status });
    revalidatePath('/admin');
}
