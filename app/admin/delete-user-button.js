'use client';
import classes from './admin.module.css';

export default function DeleteUserButton({ userId, name, action }) {
    function confirmDelete(e) {
        const ok = window.confirm(
            `Delete ${name}'s account? Their upcoming bookings will be cancelled. This cannot be undone.`
        );
        if (!ok) e.preventDefault();
    }

    return (
        <form action={action} onSubmit={confirmDelete}>
            <input type="hidden" name="userId" value={userId} />
            <button type="submit" className={classes.deleteBtn}>Delete</button>
        </form>
    );
}
