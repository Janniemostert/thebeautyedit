'use client';
import classes from '../admin.module.css';

export default function DeleteServiceButton({ id, name, action }) {
    function confirmDelete(e) {
        if (!window.confirm(`Delete "${name}"? Past bookings keep their details. To stop new bookings only, use Hide instead.`)) {
            e.preventDefault();
        }
    }

    return (
        <form action={action} onSubmit={confirmDelete}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={classes.deleteBtn}>Delete</button>
        </form>
    );
}
