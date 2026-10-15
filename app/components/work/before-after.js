'use client';
import { useState } from 'react';
import { cld } from '@/lib/cloudinary';
import { getCloudinaryVideoPoster } from '@/lib/video';
import classes from './before-after.module.css';

// Drag (or use the arrow keys) to reveal the before shot over the after shot.
export function BeforeAfterSlider({ before, after, title }) {
    const [pos, setPos] = useState(50);

    return (
        <figure className={classes.slider}>
            {/* After is the base layer and sets the size; before is clipped on top of it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cld(after, 'f_auto,q_auto,w_1600,c_limit')} alt={`${title}: after`} className={classes.base} draggable={false} />
            <div className={classes.beforeLayer} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cld(before, 'f_auto,q_auto,w_1600,c_limit')} alt={`${title}: before`} draggable={false} />
            </div>

            <div className={classes.handle} style={{ left: `${pos}%` }} aria-hidden="true">
                <span className={classes.knob}>‹ ›</span>
            </div>
            <span className={`${classes.label} ${classes.labelBefore}`}>Before</span>
            <span className={`${classes.label} ${classes.labelAfter}`}>After</span>

            <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                className={classes.range}
                aria-label="Slide to compare before and after"
            />
        </figure>
    );
}

export function BeforeAfterVideos({ before, after, title }) {
    return (
        <div className={classes.videos}>
            {[['Before', before], ['After', after]].map(([label, src]) => (
                <figure key={label} className={classes.videoBox}>
                    <figcaption className={classes.videoLabel}>{label}</figcaption>
                    <video
                        src={src}
                        poster={getCloudinaryVideoPoster(src) || undefined}
                        controls
                        playsInline
                        preload="metadata"
                        title={`${title}: ${label.toLowerCase()}`}
                    />
                </figure>
            ))}
        </div>
    );
}
