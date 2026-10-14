// Shared authorisation helpers for server actions. Server actions are public POST
// endpoints, so every admin action must check the session itself.
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export function getAdminEmails() {
    return (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

// Who receives "new booking" / "new account" emails. Defaults to the admins.
export function getNotifyEmails() {
    const list = (process.env.NOTIFY_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    return list.length ? list : getAdminEmails();
}

export async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        throw new Error('Not authorised.');
    }
    return session;
}
