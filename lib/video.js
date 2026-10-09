// Turns a YouTube / Vimeo share link into an embeddable player URL.
// Returns null when the link is not recognised (caller should fall back to a plain link).

export function getEmbedUrl(link) {
    if (!link) return null;
    let url;
    try {
        url = new URL(link);
    } catch {
        return null;
    }

    const host = url.hostname.replace(/^www\./, '');

    // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
        let id = null;
        if (host === 'youtu.be') {
            id = url.pathname.slice(1).split('/')[0];
        } else if (url.searchParams.get('v')) {
            id = url.searchParams.get('v');
        } else {
            const match = url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/);
            if (match) id = match[1];
        }
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    // Vimeo: vimeo.com/ID or player.vimeo.com/video/ID
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const match = url.pathname.match(/(\d+)/);
        return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }

    return null;
}

// Best-effort poster image for a video link (YouTube only; Vimeo needs an API call).
export function getVideoThumbnail(link) {
    const embed = getEmbedUrl(link);
    if (!embed) return null;
    const yt = embed.match(/youtube-nocookie\.com\/embed\/([^/?]+)/);
    if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
    return null;
}
