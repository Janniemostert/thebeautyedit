'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { cancelMyBooking } from '@/lib/bookingActions';
import classes from './bookings.module.css';

function Button({ confirmed }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className={classes.cancelBtn} disabled={pending}>
            {pending ? 'Cancelling…' : confirmed ? 'Cancel appointment' : 'Withdraw request'}
        </button>
    );
}

export default function CancelButton({ bookingId, confirmed }) {
    const [state, formAction] = useFormState(cancelMyBooking, {});

    function confirmCancel(e) {
        if (!window.confirm(confirmed ? 'Cancel this appointment?' : 'Withdraw this booking request?')) e.preventDefault();
    }

    return (
        <form action={formAction} onSubmit={confirmCancel}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <Button confirmed={confirmed} />
            {state.error && <p className={classes.error}>{state.error}</p>}
        </form>
    );
}
