'use server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { revalidatePath } from 'next/cache';

export async function approveUser(formData) {
    await connectDB();
    const userId = formData.get('userId');
    const tier   = formData.get('tier');

    const now = new Date();
    const expiresAt = new Date(now);

    if (tier === '1month')   expiresAt.setMonth(expiresAt.getMonth() + 1);
    if (tier === '6months')  expiresAt.setMonth(expiresAt.getMonth() + 6);
    if (tier === '1year')    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    if (tier === 'lifetime') expiresAt.setFullYear(9999);

    await User.findByIdAndUpdate(userId, {
        status:           'active',
        subscriptionTier: tier,
        accessGrantedAt:  now,
        accessExpiresAt:  expiresAt,
    });

    revalidatePath('/admin');
}

export async function updateUserStatus(formData) {
    await connectDB();
    const userId = formData.get('userId');
    const status = formData.get('status');
    await User.findByIdAndUpdate(userId, { status });
    revalidatePath('/admin');
}
