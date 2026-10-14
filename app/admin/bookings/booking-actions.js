'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { approveBooking, declineBooking, adminCancelBooking } from '@/lib/bookingActions';
import classes from '../admin.module.css';
import own from './bookings.module.css';

function Submit({ className, children, busyText }) {
    const { pending } = useFormStatus();
    return <button type="submit" className={className} disabled={pending}>{pending ? busyText : children}</button>;
}

export function PendingActions({ bookingId }) {
    const [approveState, approveAction] = useFormState(approveBooking, {});
    const [declineState, declineAction] = useFormState(declineBooking, {});
    const [declining, setDeclining] = useState(false);
    const error = approveState.error || declineState.error;

    return (
        <div className={own.actions}>
            {!declining ? (
                <div className={classes.actions}>
                    <form action={approveAction}>
                        <input type="hidden" name="bookingId" value={bookingId} />
                        <Submit className={classes.approveBtn} busyText="Approving…">Approve &amp; email client</Submit>
                    </form>
                    <button type="button" className={classes.suspendBtn} onClick={() => setDeclining(true)}>Decline</button>
                </div>
            ) : (
                <form action={declineAction} className={own.declineForm}>
                    <input type="hidden" name="bookingId" value={bookingId} />
                    <textarea name="reason" rows={2} placeholder="Message to the client (optional), e.g. suggest another time" />
                    <div className={classes.actions}>
                        <Submit className={classes.suspendBtn} busyText="Declining…">Decline &amp; email client</Submit>
                        <button type="button" className={classes.ghostBtn} onClick={() => setDeclining(false)}>Back</button>
                    </div>
                </form>
            )}
            {error && <p className={own.error}>{error}</p>}
        </div>
    );
}

export function CancelAction({ bookingId, hasEmail }) {
    const [state, formAction] = useFormState(adminCancelBooking, {});
    const [open, setOpen] = useState(false);

    if (!open) {
        return <button type="button" className={classes.ghostBtn} onClick={() => setOpen(true)}>Cancel</button>;
    }

    return (
        <form action={formAction} className={own.declineForm}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <textarea name="reason" rows={2} placeholder="Reason (optional)" />
            {hasEmail && (
                <label className={own.check}>
                    <input type="checkbox" name="notify" defaultChecked /> Email the client
                </label>
            )}
            <div className={classes.actions}>
                <Submit className={classes.suspendBtn} busyText="Cancelling…">Cancel booking</Submit>
                <button type="button" className={classes.ghostBtn} onClick={() => setOpen(false)}>Keep</button>
            </div>
            {state.error && <p className={own.error}>{state.error}</p>}
        </form>
    );
}
