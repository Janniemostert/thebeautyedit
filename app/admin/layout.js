import Link from 'next/link';
import classes from './layout.module.css';

export default function AdminLayout({ children }) {
    return (
        <div className={classes.layout}>
            <nav className={classes.sidebar} aria-label="Admin">
                <h2>Admin</h2>
                <Link href="/admin">Users</Link>
                <Link href="/admin/work">Work</Link>
                <Link href="/admin/work/new" className={classes.primary}>+ New Work</Link>
                <Link href="/" className={classes.secondary}>← View site</Link>
            </nav>
            <div className={classes.content}>{children}</div>
        </div>
    );
}
