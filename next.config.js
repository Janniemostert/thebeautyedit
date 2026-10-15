/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'www.gravatar.com' },
            { protocol: 'https', hostname: 'img.youtube.com' },
        ],
    },
    // "Work" was renamed to "Content": keep old links and shared URLs working.
    async redirects() {
        return [
            { source: '/work', destination: '/content', permanent: true },
            { source: '/work/:slug', destination: '/content/:slug', permanent: true },
            { source: '/admin/work', destination: '/admin/content', permanent: true },
            { source: '/admin/work/:path*', destination: '/admin/content/:path*', permanent: true },
        ];
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
};

module.exports = nextConfig;
