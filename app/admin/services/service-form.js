'use client';
import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { saveService } from '@/lib/scheduleActions';
import classes from '../admin.module.css';
import own from '../bookings/bookings.module.css';

function Submit({ editing }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className={own.submitBtn} disabled={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add service'}
        </button>
    );
}

// New service when `service` is empty; editing redirects back to the list after saving.
export default function ServiceForm({ service = null }) {
    const [state, formAction] = useFormState(saveService, {});
    const formRef = useRef(null);

    useEffect(() => {
        if (state.success && !service) formRef.current?.reset();
    }, [state, service]);

    return (
        <form ref={formRef} action={formAction} className={own.form}>
            {service && <input type="hidden" name="id" value={service._id} />}
            <label>
                <span>Name</span>
                <input type="text" name="name" defaultValue={service?.name} placeholder="e.g. Bridal makeup" required />
            </label>
            <label>
                <span>Length (minutes)</span>
                <input type="number" name="durationMinutes" min={5} step={5} defaultValue={service?.durationMinutes ?? 60} required />
            </label>
            <label>
                <span>Price (optional)</span>
                <input type="text" name="price" defaultValue={service?.price} placeholder="e.g. R850" />
            </label>
            <label>
                <span>Sort order</span>
                <input type="number" name="order" defaultValue={service?.order ?? 0} />
            </label>
            <label className={own.wide}>
                <span>Short description (optional)</span>
                <input type="text" name="description" defaultValue={service?.description} placeholder="What's included" />
            </label>
            <div className={`${own.wide} ${classes.actions}`}>
                <Submit editing={!!service} />
                {service && <Link href="/admin/services" className={classes.ghostBtn}>Cancel</Link>}
                {state.error && <p className={own.error}>{state.error}</p>}
                {state.success && !service && <p className={own.ok}>Service added.</p>}
            </div>
        </form>
    );
}
