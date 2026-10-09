// Read-side helpers for Work documents (plain module, not a server action file).
import { connectDB } from '@/lib/db';
import Work from '@/lib/models/Work';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export function serializeWork(doc) {
    return {
        _id:              doc._id.toString(),
        title:            doc.title,
        description:      doc.description || '',
        type:             doc.type || 'photo',
        coverImage:       doc.coverImage || null,
        images:           doc.images || [],
        videoLink:        doc.videoLink || null,
        tags:             doc.tags || [],
        featured:         !!doc.featured,
        isSubscriberOnly: !!doc.isSubscriberOnly,
        status:           doc.status || 'published',
        slug:             doc.slug,
        createdAt:        doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        updatedAt:        doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
}

export async function getViewer() {
    const session = await getServerSession(authOptions);
    const isAdmin  = session?.user?.role === 'admin';
    const isActive = session?.user?.status === 'active' || isAdmin;
    return {
        session,
        isAdmin,
        isActive,
        userId: session?.user?.id || null,
        status: session?.user?.status || null,
    };
}

export async function getPublishedWork({ type = null, limit = 0, featuredOnly = false } = {}) {
    await connectDB();
    const query = { status: 'published' };
    if (type) query.type = type;
    if (featuredOnly) query.featured = true;

    let q = Work.find(query).sort({ featured: -1, createdAt: -1 });
    if (limit) q = q.limit(limit);
    const docs = await q.lean();
    return docs.map(serializeWork);
}

export async function getWorkBySlug(slug) {
    await connectDB();
    const doc = await Work.findOne({ slug }).lean();
    return doc ? serializeWork(doc) : null;
}
