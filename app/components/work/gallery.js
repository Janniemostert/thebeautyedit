'use client';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import classes from './gallery.module.css';

export default function Gallery({ images, title }) {
    const [index, setIndex] = useState(null);
    const open = index !== null;

    const close = useCallback(() => setIndex(null), []);
    const prev  = useCallback(() => setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)), [images.length]);
    const next  = useCallback(() => setIndex((i) => (i === null ? null : (i + 1) % images.length)), [images.length]);

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        }
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, close, prev, next]);

    if (!images || images.length === 0) return null;

    return (
        <>
            <div className={classes.grid}>
                {images.map((src, i) => (
                    <button
                        key={src}
                        type="button"
                        className={classes.thumb}
                        onClick={() => setIndex(i)}
                        aria-label={`Open image ${i + 1} of ${images.length}`}
                    >
                        <Image
                            src={src}
                            alt={`${title} — image ${i + 1}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            style={{ objectFit: 'cover' }}
                        />
                    </button>
                ))}
            </div>

            {open && (
                <div className={classes.lightbox} onClick={close} role="dialog" aria-modal="true">
                    <button type="button" className={classes.closeBtn} onClick={close} aria-label="Close">✕</button>
                    {images.length > 1 && (
                        <>
                            <button type="button" className={`${classes.navBtn} ${classes.prevBtn}`} onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">‹</button>
                            <button type="button" className={`${classes.navBtn} ${classes.nextBtn}`} onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">›</button>
                        </>
                    )}
                    <div className={classes.stage} onClick={(e) => e.stopPropagation()}>
                        <Image
                            src={images[index]}
                            alt={`${title} — image ${index + 1}`}
                            fill
                            sizes="100vw"
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    </div>
                    <p className={classes.counter}>{index + 1} / {images.length}</p>
                </div>
            )}
        </>
    );
}
