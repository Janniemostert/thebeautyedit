import { getServices } from '@/lib/booking';
import { toggleServiceActive, deleteService } from '@/lib/scheduleActions';
import { formatDuration } from '@/lib/time';
import ServiceForm from './service-form';
import DeleteServiceButton from './delete-service-button';
import classes from '../admin.module.css';
import own from '../bookings/bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Services' };

export default async function AdminServicesPage() {
    const services = await getServices({ includeInactive: true });

    return (
        <main className={classes.main}>
            <h1>Services</h1>
            <p className={own.hint}>
                What clients can book. The duration decides which start times fit into your open hours.
                Hidden services stay in past bookings but can&apos;t be booked.
            </p>

            {services.length > 0 && (
                <div className={classes.tableWrap}>
                    <table className={classes.table}>
                        <thead>
                            <tr><th>Service</th><th>Length</th><th>Price</th><th>Bookable</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {services.map((svc) => (
                                <tr key={svc._id}>
                                    <td>
                                        <strong>{svc.name}</strong>
                                        {svc.description && <div className={classes.muted}>{svc.description}</div>}
                                    </td>
                                    <td>{formatDuration(svc.durationMinutes)}</td>
                                    <td>{svc.price || '—'}</td>
                                    <td>
                                        <form action={toggleServiceActive}>
                                            <input type="hidden" name="id" value={svc._id} />
                                            <button type="submit" className={svc.active ? classes.toggleOn : classes.toggleOff}>
                                                {svc.active ? 'Shown' : 'Hidden'}
                                            </button>
                                        </form>
                                    </td>
                                    <td>
                                        <div className={classes.actions}>
                                            <ServiceForm service={svc} compact />
                                            <DeleteServiceButton id={svc._id} name={svc.name} action={deleteService} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 className={classes.sectionTitle}>Add a service</h2>
            <ServiceForm />
        </main>
    );
}
