'use client';
import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createAdminBooking } from '@/lib/bookingActions';
import { formatDuration } from '@/lib/time';
import own from './bookings.module.css';

function Submit() {
    const { pending } = useFormStatus();
    return <button type="submit" className={own.submitBtn} disabled={pending}>{pending ? 'Saving…' : 'Add booking'}</button>;
}

export default function AddBookingForm({ services }) {
    const [state, formAction] = useFormState(createAdminBooking, {});
    const formRef = useRef(null);

    useEffect(() => {
        if (state.success) formRef.current?.reset();
    }, [state]);

    if (!services.length) {
        return <p className={own.error}>Add a service first (Admin → Services).</p>;
    }

    return (
        <form ref={formRef} action={formAction} className={own.form}>
            <label>
                <span>Service</span>
                <select name="serviceId" required>
                    {services.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} ({formatDuration(s.durationMinutes)}){s.active ? '' : ' – hidden'}</option>
                    ))}
                </select>
            </label>
            <label>
                <span>Date</span>
                <input type="date" name="date" required />
            </label>
            <label>
                <span>Start time</span>
                <input type="time" name="time" step={300} required />
            </label>
            <label>
                <span>Length in minutes (optional)</span>
                <input type="number" name="durationMinutes" min={5} step={5} placeholder="Service default" />
            </label>
            <label>
                <span>Client name</span>
                <input type="text" name="clientName" required />
            </label>
            <label>
                <span>Client email</span>
                <input type="email" name="clientEmail" />
            </label>
            <label>
                <span>Client phone</span>
                <input type="tel" name="clientPhone" />
            </label>
            <label className={own.wide}>
                <span>Note</span>
                <input type="text" name="note" />
            </label>
            <label className={own.check}>
                <input type="checkbox" name="notify" defaultChecked /> Email a confirmation (if an email is given)
            </label>
            <div className={own.wide}>
                <Submit />
                {state.error && <p className={own.error}>{state.error}</p>}
                {state.success && <p className={own.ok}>Booking added.</p>}
            </div>
        </form>
    );
}
