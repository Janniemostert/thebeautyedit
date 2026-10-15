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

const UPLOAD_FOLDER = 'beauty-edit/work';
const VIDEO_FOLDER  = 'beauty-edit/video';

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

async function destroyVideo(url) {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) return;
    try { await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }); } catch (_) { /* ignore */ }
}

// Videos are uploaded straight from the browser to Cloudinary (too large for a server action
// on Netlify). The browser asks for a short-lived signature here, then POSTs the file itself.
export async function getVideoUploadSignature() {
    try {
        await requireAdmin();
    } catch {
        return { error: 'Not authorised.' };
    }
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder: VIDEO_FOLDER },
        process.env.CLOUDINARYSECRET
    );
    return {
        timestamp,
        signature,
        folder:    VIDEO_FOLDER,
        apiKey:    process.env.CLOUDAPIKEY,
        cloudName: process.env.CLOUDNAME,
    };
}

function readVideoFile(formData, name = 'videoFile') {
    const url = formData.get(name)?.trim() || null;
    // Only accept URLs from our own Cloudinary account.
    if (url && !url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDNAME}/video/upload/`)) return null;
    return url;
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
    const type    = formData.get('type') === 'video' ? 'video' : 'photo';
    const format  = formData.get('format') === 'beforeAfter' ? 'beforeAfter' : 'standard';
    const videoBA = type === 'video' && format === 'beforeAfter';
    return {
        title:            formData.get('title')?.trim(),
        description:      xss(formData.get('description')?.trim() || ''),
        type,
        format,
        videoLink:        formData.get('videoLink')?.trim() || null,
        videoFile:        videoBA ? null : readVideoFile(formData),
        beforeVideo:      videoBA ? readVideoFile(formData, 'beforeVideo') : null,
        afterVideo:       videoBA ? readVideoFile(formData, 'afterVideo') : null,
        tags:             parseTags(formData.get('tags')),
        featured:         formData.get('featured') === 'on',
        isSubscriberOnly: formData.get('isSubscriberOnly') === 'on',
        status:           formData.get('status') === 'draft' ? 'draft' : 'published',
    };
}

// Returns an error message when the media needed for the chosen type and format is missing.
function checkMedia(fields, { hasBefore, hasAfter }) {
    if (fields.type === 'video' && fields.format === 'beforeAfter') {
        if (!fields.beforeVideo || !fields.afterVideo) return 'Upload both a before and an after video.';
    } else if (fields.type === 'video' && !fields.videoLink && !fields.videoFile) {
        return 'Upload a video file or add a video link for video content.';
    }
    if (fields.type === 'photo' && fields.format === 'beforeAfter' && (!hasBefore || !hasAfter)) {
        return 'Add both a before and an after image.';
    }
    return null;
}

function revalidateAll() {
    revalidatePath('/');
    revalidatePath('/content');
    revalidatePath('/photos');
    revalidatePath('/videos');
    revalidatePath('/content/[slug]', 'page');
    revalidatePath('/admin/content');
}

export async function createWork(prevState, formData) {
    await requireAdmin();
    const fields = readCommonFields(formData);

    const photoBA    = fields.type === 'photo' && fields.format === 'beforeAfter';
    const beforeFile = formData.get('beforeImage');
    const afterFile  = formData.get('afterImage');

    if (!fields.title) return { message: 'Title is required.' };
    const mediaError = checkMedia(fields, { hasBefore: isRealFile(beforeFile), hasAfter: isRealFile(afterFile) });
    if (mediaError) return { message: mediaError };

    const slug    = slugify(fields.title, { lower: true, strict: true });
    const cover   = formData.get('coverImage');
    const gallery = formData.getAll('images').filter(isRealFile);

    let coverUrl  = null;
    let beforeUrl = null;
    let afterUrl  = null;
    const imageUrls = [];
    try {
        if (photoBA) {
            beforeUrl = await uploadImage(beforeFile, `${slug}-before-${Date.now()}`);
            afterUrl  = await uploadImage(afterFile, `${slug}-after-${Date.now()}`);
        }
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
        await Work.create({ ...fields, beforeImage: beforeUrl, afterImage: afterUrl, coverImage: coverUrl, images: imageUrls, slug });
    } catch (err) {
        if (err.code === 11000) {
            return { message: `A post titled "${fields.title}" already exists. Please use a different title.` };
        }
        return { message: 'Something went wrong saving. Please try again.' };
    }

    revalidateAll();
    redirect('/admin/content');
}

export async function updateWork(prevState, formData) {
    await requireAdmin();
    const id = formData.get('id');
    const fields = readCommonFields(formData);

    if (!fields.title) return { message: 'Title is required.' };

    await connectDB();
    const existing = await Work.findById(id);
    if (!existing) return { message: 'Post not found.' };

    const photoBA    = fields.type === 'photo' && fields.format === 'beforeAfter';
    const beforeFile = formData.get('beforeImage');
    const afterFile  = formData.get('afterImage');
    const mediaError = checkMedia(fields, {
        hasBefore: isRealFile(beforeFile) || !!existing.beforeImage,
        hasAfter:  isRealFile(afterFile) || !!existing.afterImage,
    });
    if (mediaError) return { message: mediaError };

    const slug         = slugify(fields.title, { lower: true, strict: true });
    const cover        = formData.get('coverImage');
    const gallery      = formData.getAll('images').filter(isRealFile);
    const removeImages = new Set(formData.getAll('removeImages'));
    const removeCover  = formData.get('removeCover') === 'on';

    const images = existing.images.filter((url) => !removeImages.has(url));
    let coverUrl = existing.coverImage;
    // Before/after images are only kept on a photo before & after post.
    let beforeUrl = photoBA ? existing.beforeImage : null;
    let afterUrl  = photoBA ? existing.afterImage : null;

    try {
        if (photoBA && isRealFile(beforeFile)) beforeUrl = await uploadImage(beforeFile, `${slug}-before-${Date.now()}`);
        if (photoBA && isRealFile(afterFile))  afterUrl  = await uploadImage(afterFile, `${slug}-after-${Date.now()}`);
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
        await Work.findByIdAndUpdate(id, {
            ...fields, beforeImage: beforeUrl, afterImage: afterUrl, coverImage: coverUrl, images, updatedAt: new Date(),
        });
    } catch (err) {
        if (err.code === 11000) {
            return { message: 'A post with a similar title already exists. Please use a different title.' };
        }
        return { message: 'Something went wrong saving. Please try again.' };
    }

    // Clean up Cloudinary only after the DB write succeeded.
    const stillUsed = new Set([coverUrl, beforeUrl, afterUrl, ...images]);
    for (const url of removeImages) {
        if (!stillUsed.has(url)) await destroyImage(url);
    }
    if (existing.coverImage && !stillUsed.has(existing.coverImage)) {
        await destroyImage(existing.coverImage);
    }
    for (const old of [existing.beforeImage, existing.afterImage]) {
        if (old && !stillUsed.has(old)) await destroyImage(old);
    }
    const videosNow = new Set([fields.videoFile, fields.beforeVideo, fields.afterVideo]);
    for (const old of [existing.videoFile, existing.beforeVideo, existing.afterVideo]) {
        if (old && !videosNow.has(old)) await destroyVideo(old);
    }

    revalidateAll();
    redirect('/admin/content');
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
        const urls = new Set([work.coverImage, work.beforeImage, work.afterImage, ...work.images].filter(Boolean));
        for (const url of urls) await destroyImage(url);
        for (const url of [work.videoFile, work.beforeVideo, work.afterVideo]) {
            if (url) await destroyVideo(url);
        }
        await Comment.deleteMany({ postId: work._id });
        await work.deleteOne();
    }
    revalidateAll();
    redirect('/admin/content');
}
