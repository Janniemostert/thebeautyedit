import { getEmbedUrl } from '@/lib/video';
import classes from './video-embed.module.css';

export default function VideoEmbed({ link, title }) {
    if (!link) return null;
    const embed = getEmbedUrl(link);

    if (!embed) {
        return (
            <p className={classes.fallback}>
                Watch: <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
            </p>
        );
    }

    return (
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
    );
}
