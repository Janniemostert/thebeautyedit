'use client';
import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createWork, updateWork, deleteWork } from '@/lib/workActions';
import VideoUploader from './VideoUploader';
import classes from './work-form.module.css';

const initialState = { message: null };

function SubmitButtons({ isEdit }) {
    const { pending } = useFormStatus();
    return (
        <div className={classes.submitRow}>
            <button type="submit" name="status" value="published" className={classes.submitBtn} disabled={pending}>
                {pending ? 'Saving…' : isEdit ? 'Save & Publish' : 'Publish'}
            </button>
            <button type="submit" name="status" value="draft" className={`${classes.submitBtn} ${classes.draftBtn}`} disabled={pending}>
                Save as Draft
            </button>
            {pending && <span className={classes.hint}>Uploading images can take a moment…</span>}
        </div>
    );
}

function FilePreviews({ files }) {
    const [urls, setUrls] = useState([]);
    useEffect(() => {
        const next = files.map((f) => URL.createObjectURL(f));
        setUrls(next);
        return () => next.forEach((u) => URL.revokeObjectURL(u));
    }, [files]);
    if (urls.length === 0) return null;
    return (
        <div className={classes.previewGrid}>
            {urls.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt={`Selected ${i + 1}`} className={classes.previewImg} />
            ))}
        </div>
    );
}

// One before or after image picker, showing the current image when editing.
function SideImage({ side, current }) {
    const [files, setFiles] = useState([]);
    const label = side === 'before' ? 'Before' : 'After';
    return (
        <div className={classes.field}>
            <label htmlFor={`${side}Image`}>{current ? `Replace ${label.toLowerCase()} image` : `${label} image *`}</label>
            {current && files.length === 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current} alt={`Current ${label.toLowerCase()}`} className={classes.previewImg} />
            )}
            <FilePreviews files={files} />
            <input
                id={`${side}Image`}
                type="file"
                name={`${side}Image`}
                accept="image/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
        </div>
    );
}

export default function WorkForm({ work = null }) {
    const isEdit = !!work;
    const [state, formAction] = useFormState(isEdit ? updateWork : createWork, initialState);
    const [type, setType] = useState(work?.type || 'photo');
    const [format, setFormat] = useState(work?.format || 'standard');
    const beforeAfter = format === 'beforeAfter';
    const [coverFiles, setCoverFiles] = useState([]);
    const [galleryFiles, setGalleryFiles] = useState([]);

    return (
        <>
            <form action={formAction} className={classes.form}>
                {isEdit && <input type="hidden" name="id" value={work._id} />}

                {state?.message && <p className={classes.error}>{state.message}</p>}

                <div className={classes.field}>
                    <label htmlFor="title">Title *</label>
                    <input id="title" type="text" name="title" defaultValue={work?.title || ''} required />
                </div>

                <fieldset className={classes.typeRow}>
                    <legend>Type *</legend>
                    <label className={`${classes.typeChip} ${type === 'photo' ? classes.typeChipActive : ''}`}>
                        <input type="radio" name="type" value="photo" checked={type === 'photo'} onChange={() => setType('photo')} />
                        Photo
                    </label>
                    <label className={`${classes.typeChip} ${type === 'video' ? classes.typeChipActive : ''}`}>
                        <input type="radio" name="type" value="video" checked={type === 'video'} onChange={() => setType('video')} />
                        Video
                    </label>
                </fieldset>

                <fieldset className={classes.typeRow}>
                    <legend>Post style *</legend>
                    <label className={`${classes.typeChip} ${!beforeAfter ? classes.typeChipActive : ''}`}>
                        <input type="radio" name="format" value="standard" checked={!beforeAfter} onChange={() => setFormat('standard')} />
                        Simple post
                    </label>
                    <label className={`${classes.typeChip} ${beforeAfter ? classes.typeChipActive : ''}`}>
                        <input type="radio" name="format" value="beforeAfter" checked={beforeAfter} onChange={() => setFormat('beforeAfter')} />
                        Before &amp; after
                    </label>
                </fieldset>

                {beforeAfter && (
                    <div className={classes.pair}>
                        {type === 'photo' ? (
                            <>
                                <SideImage side="before" current={work?.beforeImage} />
                                <SideImage side="after" current={work?.afterImage} />
                            </>
                        ) : (
                            <>
                                <VideoUploader name="beforeVideo" label="Before video *" initialUrl={work?.beforeVideo || null} showHint={false} />
                                <VideoUploader name="afterVideo" label="After video *" initialUrl={work?.afterVideo || null} showHint={false} />
                            </>
                        )}
                        <span className={`${classes.hint} ${classes.pairHint}`}>
                            {type === 'photo'
                                ? 'Visitors drag a slider across the two images, so use photos with the same framing and size. Keep both under about 4 MB together.'
                                : 'The two videos play side by side. Uploads go straight to Cloudinary (up to 100 MB each, MP4 works best).'}
                        </span>
                    </div>
                )}

                {type === 'video' && !beforeAfter && <VideoUploader initialUrl={work?.videoFile || null} />}

                {!beforeAfter && <div className={classes.field}>
                    <label htmlFor="videoLink">Video link (optional)</label>
                    <input
                        id="videoLink"
                        type="url"
                        name="videoLink"
                        defaultValue={work?.videoLink || ''}
                        placeholder="https://youtube.com/watch?v=…, https://vimeo.com/…, or a WhatsApp / Instagram link"
                    />
                    <span className={classes.hint}>
                        YouTube and Vimeo links play on the page. WhatsApp, Instagram and TikTok links can&apos;t be embedded,
                        so they show as a &ldquo;Watch on …&rdquo; button next to the uploaded video.
                        {type === 'video' && ' A video post needs either an uploaded file or a link.'}
                    </span>
                </div>}

                <div className={classes.field}>
                    <label htmlFor="description">Description</label>
                    <textarea id="description" name="description" rows={6} defaultValue={work?.description || ''} placeholder="What was this post about? Tools, process, client…" />
                </div>

                <div className={classes.field}>
                    <label htmlFor="tags">Tags</label>
                    <input id="tags" type="text" name="tags" defaultValue={work?.tags?.join(', ') || ''} placeholder="colour grade, wedding, 4k" />
                    <span className={classes.hint}>Comma separated.</span>
                </div>

                <div className={classes.field}>
                    <label htmlFor="coverImage">{isEdit ? 'Replace cover image' : 'Cover image'} {beforeAfter ? '(optional, otherwise the after shot is used)' : type === 'photo' ? '' : '(optional, otherwise a frame from the video is used)'}</label>
                    {isEdit && work.coverImage && (
                        <div className={classes.currentRow}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={work.coverImage} alt="Current cover" className={classes.previewImg} />
                            <label className={classes.removeLabel}>
                                <input type="checkbox" name="removeCover" /> Remove cover
                            </label>
                        </div>
                    )}
                    <input
                        id="coverImage"
                        type="file"
                        name="coverImage"
                        accept="image/*"
                        onChange={(e) => setCoverFiles(Array.from(e.target.files || []))}
                    />
                    <FilePreviews files={coverFiles} />
                </div>

                <div className={classes.field}>
                    <label htmlFor="images">{isEdit ? 'Add gallery images' : 'Gallery images'}</label>
                    {isEdit && work.images?.length > 0 && (
                        <div className={classes.previewGrid}>
                            {work.images.map((url) => (
                                <label key={url} className={classes.removable}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" className={classes.previewImg} />
                                    <span className={classes.removeLabel}>
                                        <input type="checkbox" name="removeImages" value={url} /> Remove
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                    <input
                        id="images"
                        type="file"
                        name="images"
                        accept="image/*"
                        multiple
                        onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
                    />
                    <span className={classes.hint}>You can select several files at once. Keep each upload under about 4 MB in total per save.</span>
                    <FilePreviews files={galleryFiles} />
                </div>

                <div className={classes.switchRow}>
                    <span className={classes.switchLabel}>Featured on home</span>
                    <label className={classes.toggle}>
                        <input type="checkbox" name="featured" defaultChecked={!!work?.featured} />
                        <span className={classes.toggleSlider}></span>
                    </label>
                </div>

                <div className={classes.switchRow}>
                    <span className={classes.switchLabel}>Members only</span>
                    <label className={classes.toggle}>
                        <input type="checkbox" name="isSubscriberOnly" defaultChecked={!!work?.isSubscriberOnly} />
                        <span className={classes.toggleSlider}></span>
                    </label>
                </div>

                <SubmitButtons isEdit={isEdit} />
            </form>

            {isEdit && (
                <>
                    <hr className={classes.divider} />
                    <form action={deleteWork}>
                        <input type="hidden" name="id" value={work._id} />
                        <button
                            type="submit"
                            className={`${classes.submitBtn} ${classes.dangerBtn}`}
                            onClick={(e) => { if (!confirm('Delete this post and all its images? This cannot be undone.')) e.preventDefault(); }}
                        >
                            Delete this post
                        </button>
                    </form>
                </>
            )}
        </>
    );
}
