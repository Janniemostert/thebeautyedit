import { connectDB } from '@/lib/db';
import Work from '@/lib/models/Work';
import { serializeWork } from '@/lib/work';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import mongoose from 'mongoose';
import WorkForm from '../../WorkForm';
import classes from '../../work-form.module.css';

export const metadata = { title: 'Edit Work' };

export default async function EditWorkPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/');

    if (!mongoose.isValidObjectId(params.id)) notFound();

    await connectDB();
    const doc = await Work.findById(params.id).lean();
    if (!doc) notFound();

    return (
        <main className={classes.main}>
            <h1>Edit Work</h1>
            <WorkForm work={serializeWork(doc)} />
        </main>
    );
}
