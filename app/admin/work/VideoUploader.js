'use client';
import { useState } from 'react';
import { getVideoUploadSignature } from '@/lib/workActions';
import classes from './work-form.module.css';

const MAX_MB = 100; // Cloudinary free-plan limit per video file

export default function VideoUploader({ initialUrl = null }) {
    const [url, setUrl]           = useState(initialUrl);
    const [progress, setProgress] = useState(null);
    const [error, setError]       = useState(null);

    async function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);

        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. Please keep videos under ${MAX_MB} MB.`);
            e.target.value = '';
            return;
        }

        setProgress(0);
        try {
            const sig = await getVideoUploadSignature();
            if (sig.error) throw new Error(sig.error);

            const body = new FormData();
            body.append('file', file);
            body.append('api_key', sig.apiKey);
            body.append('timestamp', String(sig.timestamp));
            body.append('signature', sig.signature);
            body.append('folder', sig.folder);

            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`);
                xhr.upload.onprogress = (ev) => {
                    if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
                    else reject(new Error('Cloudinary rejected the upload. Please try again.'));
                };
                xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
                xhr.send(body);
            });

            setUrl(result.secure_url);
        } catch (err) {
            setError(err.message || 'Upload failed.');
        } finally {
            setProgress(null);
            e.target.value = '';
        }
    }

    return (
        <div className={classes.field}>
            <label htmlFor="videoUpload">Video file</label>
            <input type="hidden" name="videoFile" value={url || ''} />

            {url && (
                <div className={classes.videoPreviewWrap}>
                    <video src={url} controls playsInline preload="metadata" className={classes.videoPreview} />
                    <button type="button" className={classes.removeLabel} onClick={() => setUrl(null)}>
                        ✕ Remove video
                    </button>
                </div>
            )}

            <input
                id="videoUpload"
                type="file"
                accept="video/*"
                onChange={handleFile}
                disabled={progress !== null}
            />

            {progress !== null && (
                <div className={classes.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className={classes.progressBar} style={{ width: `${progress}%` }} />
                    <span className={classes.hint}>Uploading… {progress}%</span>
                </div>
            )}

            {error && <p className={classes.error}>{error}</p>}

            <span className={classes.hint}>
                Uploads go straight to Cloudinary, so larger files are fine (up to {MAX_MB} MB). MP4 works best.
                For a WhatsApp video: save it from the channel to your phone or PC first, then upload it here.
            </span>
        </div>
    );
}
