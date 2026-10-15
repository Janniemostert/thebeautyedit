import Link from 'next/link';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Service from '@/lib/models/Service';
import { serializeService } from '@/lib/booking';
import ServiceForm from '../../service-form';
import classes from '../../../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit service' };

export default async function EditServicePage({ params }) {
    if (!mongoose.isValidObjectId(params.id)) notFound();
    await connectDB();
    const doc = await Service.findById(params.id).lean();
    if (!doc) notFound();

    return (
        <main className={classes.main}>
            <p><Link href="/admin/services" className={classes.muted}>← All services</Link></p>
            <h1>Edit service</h1>
            <ServiceForm service={serializeService(doc)} />
        </main>
    );
}
