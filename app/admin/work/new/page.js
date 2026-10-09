import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import WorkForm from '../WorkForm';
import classes from '../work-form.module.css';

export const metadata = { title: 'New Work' };

export default async function NewWorkPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/');

    return (
        <main className={classes.main}>
            <h1>New Work</h1>
            <WorkForm />
        </main>
    );
}
