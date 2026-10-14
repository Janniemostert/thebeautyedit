import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { SITE_URL } from '@/lib/site';
import { getAdminEmails, getNotifyEmails } from '@/lib/authz';
import { sendEmail, siteUrl } from '@/lib/email';

// In production the callback must always come back to the live site.
if (process.env.NODE_ENV === 'production') {
    process.env.NEXTAUTH_URL = SITE_URL;
}

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        // Email + password accounts are created on /auth/register.
        CredentialsProvider({
            id: 'credentials',
            name: 'Email',
            credentials: {
                email:    { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const email    = String(credentials?.email || '').trim().toLowerCase();
                const password = String(credentials?.password || '');
                if (!email || !password) return null;

                await connectDB();
                const user = await User.findOne({ email }).select('+passwordHash').lean();
                if (!user?.passwordHash) return null;
                if (!(await bcrypt.compare(password, user.passwordHash))) return null;

                return { id: user._id.toString(), name: user.name, email: user.email };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            await connectDB();
            const email   = (profile?.email || user?.email || '').toLowerCase();
            const isAdmin = getAdminEmails().includes(email);
            const existing = await User.findOne({ email });

            if (!existing && account?.provider === 'google') {
                await User.create({
                    name:   profile.name,
                    email,
                    role:   isAdmin ? 'admin' : 'subscriber',
                    status: isAdmin ? 'active' : 'pending',
                    accessGrantedAt:  isAdmin ? new Date() : null,
                    accessExpiresAt:  null,
                    subscriptionTier: isAdmin ? 'lifetime' : null,
                });
                if (!isAdmin) {
                    await sendEmail({
                        to: getNotifyEmails(),
                        subject: `New account waiting for approval: ${profile.name}`,
                        heading: 'New account to approve',
                        lines: [`${profile.name} (${email}) signed up with Google and is waiting for approval.`],
                        button: { label: 'Review accounts', href: `${siteUrl()}/admin` },
                    });
                }
            } else if (existing && isAdmin && existing.role !== 'admin') {
                // Someone added to ADMIN_EMAILS after they first signed in: promote them.
                existing.role = 'admin';
                existing.status = 'active';
                existing.subscriptionTier = 'lifetime';
                existing.accessGrantedAt = existing.accessGrantedAt || new Date();
                await existing.save();
            }

            return true;
        },

        async jwt({ token }) {
            await connectDB();
            const dbUser = await User.findOne({ email: token.email?.toLowerCase() }).lean();
            if (dbUser) {
                token.id     = dbUser._id.toString();
                token.role   = dbUser.role;
                token.status = dbUser.status;
            } else {
                // Account deleted (or a cookie from another database): drop any old rights.
                token.id     = null;
                token.role   = null;
                token.status = null;
            }
            return token;
        },

        async session({ session, token }) {
            session.user.id     = token.id;
            session.user.role   = token.role;
            session.user.status = token.status;
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
