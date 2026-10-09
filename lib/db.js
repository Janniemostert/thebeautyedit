import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    // Checked here rather than at import time so a build without env vars still succeeds.
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not set. Add it to .env.local locally or to the Netlify environment variables.');
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        // dbName pins this app to its own database even if the URI names another one.
        cached.promise = mongoose.connect(MONGODB_URI, { dbName: 'ej-edit' }).then((m) => m);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
