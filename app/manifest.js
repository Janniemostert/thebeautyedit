import { site } from '@/lib/site';

// Served at /manifest.webmanifest. Makes the site installable on phone home screens.
export default function manifest() {
    return {
        name:             site.fullName,
        short_name:       site.name,
        description:      site.description,
        start_url:        '/',
        scope:            '/',
        display:          'standalone',
        orientation:      'portrait',
        background_color: '#0b0b0d',
        theme_color:      '#0b0b0d',
        icons: [
            { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
