// Adds Cloudinary delivery transformations to an upload URL.
// f_auto picks WebP/AVIF per browser, q_auto compresses sensibly, w_ caps the width.
export function cld(url, transform = 'f_auto,q_auto') {
    if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/${transform}/`);
}
