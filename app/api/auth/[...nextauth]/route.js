import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async signIn({ profile }) {
            await connectDB();

            const existing = await User.findOne({ email: profile.email });

            if (!existing) {
                const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
                const isAdmin = adminEmails.includes(profile.email.toLowerCase());
                await User.create({
                    name:   profile.name,
                    email:  profile.email,
                    role:   isAdmin ? 'admin' : 'subscriber',
                    status: isAdmin ? 'active' : 'pending',
                    accessGrantedAt:  isAdmin ? new Date() : null,
                    accessExpiresAt:  null,
                    subscriptionTier: isAdmin ? 'lifetime' : null,
                });
            }

            return true;
        },

        async jwt({ token }) {
            await connectDB();
            const dbUser = await User.findOne({ email: token.email }).lean();
            if (dbUser) {
                token.id     = dbUser._id.toString();
                token.role   = dbUser.role;
                token.status = dbUser.status;
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
