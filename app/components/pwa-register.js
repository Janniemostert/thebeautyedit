'use client';
import { useEffect } from 'react';

// Registers the service worker in production only (it would fight hot reload in dev).
export default function PwaRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ });
    }, []);
    return null;
}
