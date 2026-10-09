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

export default function WorkForm({ work = null }) {
    const isEdit = !!work;
    const [state, formAction] = useFormState(isEdit ? updateWork : createWork, initialState);
    const [type, setType] = useState(work?.type || 'photo');
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

                {type === 'video' && <VideoUploader initialUrl={work?.videoFile || null} />}

                <div className={classes.field}>
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
                        {type === 'video' && ' A video piece needs either an uploaded file or a link.'}
                    </span>
                </div>

                <div className={classes.field}>
                    <label htmlFor="description">Description</label>
                    <textarea id="description" name="description" rows={6} defaultValue={work?.description || ''} placeholder="What was this piece about? Tools, process, client…" />
                </div>

                <div className={classes.field}>
                    <label htmlFor="tags">Tags</label>
                    <input id="tags" type="text" name="tags" defaultValue={work?.tags?.join(', ') || ''} placeholder="colour grade, wedding, 4k" />
                    <span className={classes.hint}>Comma separated.</span>
                </div>

                <div className={classes.field}>
                    <label htmlFor="coverImage">{isEdit ? 'Replace cover image' : 'Cover image'} {type === 'photo' ? '' : '(optional, otherwise a frame from the video is used)'}</label>
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
                            onClick={(e) => { if (!confirm('Delete this piece and all its images? This cannot be undone.')) e.preventDefault(); }}
                        >
                            Delete this work
                        </button>
                    </form>
                </>
            )}
        </>
    );
}
