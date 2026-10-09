/* Service worker for The Beauty Edit.
   - Pages: network first, fall back to the last cached copy, then /offline.
   - Hashed build assets, icons and Cloudinary media: cache first.
   - Auth, admin and API requests are never cached.
   Bump VERSION to drop old caches after a big change. */

const VERSION      = 'v2';
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE   = `pages-${VERSION}`;
const OFFLINE_URL  = '/offline';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(PAGE_CACHE)
            .then((cache) => cache.add(OFFLINE_URL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

async function cacheFirst(request, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
}

async function networkFirst(request) {
    const cache = await caches.open(PAGE_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached = await cache.match(request);
        return cached || cache.match(OFFLINE_URL);
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Cloudinary photos & video posters: cache first (URLs are unique per upload).
    if (url.hostname === 'res.cloudinary.com') {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    if (url.origin !== self.location.origin) return;

    // Never cache auth, admin or API traffic.
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth')) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/_next/image') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname === '/logo.png'
    ) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    }
});
