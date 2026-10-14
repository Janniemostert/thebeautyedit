import Link from 'next/link';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { getServices } from '@/lib/booking';
import { getViewer } from '@/lib/work';
import BookingFlow from './booking-flow';
import classes from './book.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Book an appointment' };

export default async function BookPage({ searchParams }) {
    const [services, viewer] = await Promise.all([getServices(), getViewer()]);

    let phone = '';
    if (viewer.userId) {
        await connectDB();
        const user = await User.findById(viewer.userId).select('phone').lean();
        phone = user?.phone || '';
    }

    const initialServiceId = services.some((s) => s._id === searchParams?.service) ? searchParams.service : null;

    return (
        <main className={classes.main}>
            <header className={classes.intro}>
                <p className={classes.eyebrow}>Appointments</p>
                <h1>Book an appointment</h1>
                <p>Choose a service, pick an open time and send your request. You will get an email as soon as it is confirmed.</p>
            </header>

            {services.length === 0 ? (
                viewer.isAdmin ? (
                    <p className={classes.empty}>
                        No services yet, so there are no times to show. <Link href="/admin/services">Add a service in Admin → Services</Link> and
                        the open times appear here.
                    </p>
                ) : (
                    <p className={classes.empty}>Bookings open soon. Please check back shortly.</p>
                )
            ) : (
                <BookingFlow
                    services={services}
                    initialServiceId={initialServiceId}
                    viewer={{
                        signedIn: !!viewer.session,
                        canBook:  viewer.isActive,
                        status:   viewer.status,
                        phone,
                    }}
                />
            )}
        </main>
    );
}
