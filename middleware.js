import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const { token } = req.nextauth;
        const { pathname } = req.nextUrl;

        // Not signed in at all — redirect to sign in
        if (!token) {
            return NextResponse.redirect(new URL('/auth/signin', req.url));
        }

        // Signed in but pending — only allow /pending and /auth routes
        if (token.status === 'pending' && !pathname.startsWith('/pending') && !pathname.startsWith('/auth')) {
            return NextResponse.redirect(new URL('/pending', req.url));
        }

        // Non-admin trying to access /admin
        if (pathname.startsWith('/admin') && token.role !== 'admin') {
            return NextResponse.redirect(new URL('/', req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: '/auth/signin',
        },
    }
);

export const config = {
    // /book is public so visitors can see open times; requesting one is checked in the action.
    matcher: ['/admin/:path*', '/pending', '/bookings'],
};
