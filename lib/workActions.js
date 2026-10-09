'use server';
import { connectDB } from '@/lib/db';
import Work from '@/lib/models/Work';
import Comment from '@/lib/models/Comment';
import { v2 as cloudinary } from 'cloudinary';
import slugify from 'slugify';
import xss from 'xss';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key:    process.env.CLOUDAPIKEY,
    api_secret: process.env.CLOUDINARYSECRET,
});

const UPLOAD_FOLDER = 'ej-edit/work';

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        throw new Error('Not authorised.');
    }
}

function extractCloudinaryPublicId(url) {
    if (!url || !url.includes('res.cloudinary.com')) return null;
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    let path = url.substring(uploadIndex + 8);
    path = path.replace(/^v\d+\//, '');   // strip version
    path = path.replace(/\.[^/.]+$/, ''); // strip extension
    return path;
}

async function uploadImage(file, publicId) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder: UPLOAD_FOLDER, public_id: publicId, resource_type: 'image' },
            (error, res) => (error ? reject(new Error('Image upload failed')) : resolve(res))
        ).end(buffer);
    });
    return result.secure_url;
}

async function destroyImage(url) {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) return;
    try { await cloudinary.uploader.destroy(publicId); } catch (_) { /* ignore */ }
}

function isRealFile(file) {
    return file && typeof file === 'object' && typeof file.size === 'number' && file.size > 0;
}

function parseTags(raw) {
    return (raw || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20);
}

function readCommonFields(formData) {
    return {
        title:            formData.get('title')?.trim(),
        description:      xss(formData.get('description')?.trim() || ''),
        type:             formData.get('type') === 'video' ? 'video' : 'photo',
        videoLink:        formData.get('videoLink')?.trim() || null,
        tags:             parseTags(formData.get('tags')),
        featured:         formData.get('featured') === 'on',
        isSubscriberOnly: formData.get('isSubscriberOnly') === 'on',
        status:           formData.get('status') === 'draft' ? 'draft' : 'published',
    };
}

function revalidateAll() {
    revalidatePath('/');
    revalidatePath('/work');
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/work/[slug]', 'page');
    revalidatePath('/admin/work');
}

export async function createWork(prevState, formData) {
    await requireAdmin();
    const fields = readCommonFields(formData);

    if (!fields.title) return { message: 'Title is required.' };
    if (fields.type === 'video' && !fields.videoLink) return { message: 'A video link is required for video work.' };

    const slug    = slugify(fields.title, { lower: true, strict: true });
    const cover   = formData.get('coverImage');
    const gallery = formData.getAll('images').filter(isRealFile);

    let coverUrl = null;
    const imageUrls = [];
    try {
        if (isRealFile(cover)) {
            coverUrl = await uploadImage(cover, `${slug}-cover-${Date.now()}`);
        }
        for (let i = 0; i < gallery.length; i++) {
            imageUrls.push(await uploadImage(gallery[i], `${slug}-${Date.now()}-${i}`));
        }
    } catch (err) {
        return { message: 'Image upload failed. Please try smaller files or fewer images.' };
    }

    if (!coverUrl && imageUrls.length > 0) coverUrl = imageUrls[0];

    await connectDB();
    try {
        await Work.create({ ...fields, coverImage: coverUrl, images: imageUrls, slug });
    } catch (err) {
        if (err.code === 11000) {
            return { message: `A piece titled "${fields.title}" already exists. Please use a different title.` };
        }
        return { message: 'Something went wrong saving. Please try again.' };
    }

    revalidateAll();
    redirect('/admin/work');
}

export async function updateWork(prevState, formData) {
    await requireAdmin();
    const id = formData.get('id');
    const fields = readCommonFields(formData);

    if (!fields.title) return { message: 'Title is required.' };
    if (fields.type === 'video' && !fields.videoLink) return { message: 'A video link is required for video work.' };

    await connectDB();
    const existing = await Work.findById(id);
    if (!existing) return { message: 'Work not found.' };

    const slug         = slugify(fields.title, { lower: true, strict: true });
    const cover        = formData.get('coverImage');
    const gallery      = formData.getAll('images').filter(isRealFile);
    const removeImages = new Set(formData.getAll('removeImages'));
    const removeCover  = formData.get('removeCover') === 'on';

    const images = existing.images.filter((url) => !removeImages.has(url));
    let coverUrl = existing.coverImage;

    try {
        if (isRealFile(cover)) {
            coverUrl = await uploadImage(cover, `${slug}-cover-${Date.now()}`);
        } else if (removeCover) {
            coverUrl = null;
        }
        for (let i = 0; i < gallery.length; i++) {
            images.push(await uploadImage(gallery[i], `${slug}-${Date.now()}-${i}`));
        }
    } catch (err) {
        return { message: 'Image upload failed. Please try smaller files or fewer images.' };
    }

    if (!coverUrl && images.length > 0) coverUrl = images[0];

    try {
        await Work.findByIdAndUpdate(id, { ...fields, coverImage: coverUrl, images, updatedAt: new Date() });
    } catch (err) {
        if (err.code === 11000) {
            return { message: 'A piece with a similar title already exists. Please use a different title.' };
        }
        return { message: 'Something went wrong saving. Please try again.' };
    }

    // Clean up Cloudinary only after the DB write succeeded.
    const stillUsed = new Set([coverUrl, ...images]);
    for (const url of removeImages) {
        if (!stillUsed.has(url)) await destroyImage(url);
    }
    if (existing.coverImage && !stillUsed.has(existing.coverImage)) {
        await destroyImage(existing.coverImage);
    }

    revalidateAll();
    redirect('/admin/work');
}

export async function toggleWorkStatus(formData) {
    await requireAdmin();
    const id = formData.get('id');
    const current = formData.get('current');
    const next = current === 'published' ? 'draft' : 'published';
    await connectDB();
    await Work.findByIdAndUpdate(id, { status: next });
    revalidateAll();
}

export async function toggleWorkFeatured(formData) {
    await requireAdmin();
    const id = formData.get('id');
    const current = formData.get('current') === 'true';
    await connectDB();
    await Work.findByIdAndUpdate(id, { featured: !current });
    revalidateAll();
}

export async function deleteWork(formData) {
    await requireAdmin();
    const id = formData.get('id');
    await connectDB();
    const work = await Work.findById(id);
    if (work) {
        const urls = new Set([work.coverImage, ...work.images].filter(Boolean));
        for (const url of urls) await destroyImage(url);
        await Comment.deleteMany({ postId: work._id });
        await work.deleteOne();
    }
    revalidateAll();
    redirect('/admin/work');
}
