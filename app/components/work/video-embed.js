import { getEmbedUrl, getLinkLabel, getCloudinaryVideoPoster } from '@/lib/video';
import classes from './video-embed.module.css';

// Renders, in order of preference:
//  1. an uploaded Cloudinary video file in a native player
//  2. a YouTube / Vimeo link as an embedded iframe
//  3. any other link (WhatsApp, Instagram, TikTok…) as a "Watch on …" button
export default function VideoEmbed({ file, link, poster, title }) {
    const embed = !file && link ? getEmbedUrl(link) : null;
    const externalLink = link && (file || !embed) ? link : null;

    return (
        <div className={classes.wrap}>
            {file && (
                <video
                    src={file}
                    poster={poster || getCloudinaryVideoPoster(file) || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className={classes.player}
                    title={title}
                />
            )}

            {embed && (
                <div className={classes.frame}>
                    <iframe
                        src={embed}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                </div>
            )}

            {externalLink && (
                <a href={externalLink} target="_blank" rel="noopener noreferrer" className={classes.externalBtn}>
                    {getLinkLabel(externalLink)} ↗
                </a>
            )}
        </div>
    );
}
