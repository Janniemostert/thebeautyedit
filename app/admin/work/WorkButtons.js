'use client';
import { deleteWork, toggleWorkStatus, toggleWorkFeatured } from '@/lib/workActions';
import classes from '../admin.module.css';

export function DeleteWorkButton({ id }) {
    function handleSubmit(e) {
        if (!confirm('Delete this piece? All its images will be removed from Cloudinary. This cannot be undone.')) {
            e.preventDefault();
        }
    }
    return (
        <form action={deleteWork} onSubmit={handleSubmit} style={{ display: 'inline' }}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={classes.suspendBtn}>Delete</button>
        </form>
    );
}

export function ToggleStatusButton({ id, status }) {
    const isPublished = status === 'published';
    return (
        <form action={toggleWorkStatus} style={{ display: 'inline' }}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="current" value={status} />
            <button
                type="submit"
                className={isPublished ? classes.toggleOn : classes.toggleOff}
                title={isPublished ? 'Click to unpublish (draft)' : 'Click to publish'}
            >
                {isPublished ? 'Published' : 'Draft'}
            </button>
        </form>
    );
}

export function ToggleFeaturedButton({ id, featured }) {
    return (
        <form action={toggleWorkFeatured} style={{ display: 'inline' }}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="current" value={featured ? 'true' : 'false'} />
            <button
                type="submit"
                className={featured ? classes.toggleOn : classes.toggleOff}
                title={featured ? 'Remove from featured' : 'Feature on home page'}
            >
                {featured ? '★ Featured' : '☆ Feature'}
            </button>
        </form>
    );
}
