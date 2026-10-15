import Link from 'next/link';
import { getServices } from '@/lib/booking';
import { toggleServiceActive, deleteService } from '@/lib/scheduleActions';
import { formatDuration } from '@/lib/time';
import ServiceForm from './service-form';
import DeleteServiceButton from './delete-service-button';
import classes from '../admin.module.css';
import own from '../bookings/bookings.module.css';
import s from './services.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Services' };

export default async function AdminServicesPage() {
    const services = await getServices({ includeInactive: true });

    return (
        <main className={classes.main}>
            <h1>Services</h1>
            <p className={own.hint}>
                What clients can book. The length decides which start times fit into your open hours.
                Hidden services stay in past bookings but can&apos;t be booked.
            </p>

            {services.length > 0 && (
                <div className={s.list}>
                    {services.map((svc) => (
                        <article key={svc._id} className={`${s.card} ${svc.active ? '' : s.hidden}`}>
                            <div className={s.info}>
                                <h2 className={s.name}>{svc.name}</h2>
                                <p className={s.meta}>
                                    {formatDuration(svc.durationMinutes)}
                                    {svc.price && <> · {svc.price}</>}
                                </p>
                                {svc.description && <p className={s.desc}>{svc.description}</p>}
                            </div>
                            <div className={classes.actions}>
                                <form action={toggleServiceActive}>
                                    <input type="hidden" name="id" value={svc._id} />
                                    <button
                                        type="submit"
                                        className={svc.active ? classes.toggleOn : classes.toggleOff}
                                        title={svc.active ? 'Click to hide from clients' : 'Click to show to clients'}
                                    >
                                        {svc.active ? 'Shown' : 'Hidden'}
                                    </button>
                                </form>
                                <Link href={`/admin/services/${svc._id}/edit`} className={classes.ghostBtn}>Edit</Link>
                                <DeleteServiceButton id={svc._id} name={svc.name} action={deleteService} />
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <h2 className={classes.sectionTitle}>Add a service</h2>
            <ServiceForm />
        </main>
    );
}
