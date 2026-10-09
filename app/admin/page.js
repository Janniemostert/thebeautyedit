import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { approveUser, updateUserStatus } from '@/lib/adminActions';
import classes from './admin.module.css';

function getExpiryClass(expiresAt) {
    if (!expiresAt) return '';
    const now = new Date();
    const diff = new Date(expiresAt) - now;
    const oneDay  = 1000 * 60 * 60 * 24;
    const oneWeek = oneDay * 7;
    if (diff <= oneDay)  return classes.red;
    if (diff <= oneWeek) return classes.yellow;
    return classes.green;
}

export default async function AdminPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/');

    await connectDB();
    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    return (
        <main className={classes.main}>
            <h1>Users</h1>
            <div className={classes.tableWrap}>
            <table className={classes.table}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Tier</th>
                        <th>Registered</th>
                        <th>Expires</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user._id.toString()}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                                <span className={`${classes.badge} ${classes[user.status]}`}>
                                    {user.status}
                                </span>
                            </td>
                            <td>{user.subscriptionTier || '—'}</td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                                {user.accessExpiresAt ? (
                                    <span className={getExpiryClass(user.accessExpiresAt)}>
                                        {user.subscriptionTier === 'lifetime'
                                            ? 'Lifetime'
                                            : new Date(user.accessExpiresAt).toLocaleDateString()}
                                    </span>
                                ) : '—'}
                            </td>
                            <td className={classes.actions}>
                                {user.status === 'pending' && (
                                    <form action={approveUser}>
                                        <input type="hidden" name="userId" value={user._id.toString()} />
                                        <select name="tier" required>
                                            <option value="">Select tier</option>
                                            <option value="1month">1 Month</option>
                                            <option value="6months">6 Months</option>
                                            <option value="1year">1 Year</option>
                                            <option value="lifetime">Lifetime</option>
                                        </select>
                                        <button type="submit" className={classes.approveBtn}>Approve</button>
                                    </form>
                                )}
                                {user.status === 'active' && user.role !== 'admin' && (
                                    <form action={updateUserStatus}>
                                        <input type="hidden" name="userId" value={user._id.toString()} />
                                        <input type="hidden" name="status" value="suspended" />
                                        <button type="submit" className={classes.suspendBtn}>Suspend</button>
                                    </form>
                                )}
                                {user.status === 'suspended' && (
                                    <form action={updateUserStatus}>
                                        <input type="hidden" name="userId" value={user._id.toString()} />
                                        <input type="hidden" name="status" value="active" />
                                        <button type="submit" className={classes.approveBtn}>Reinstate</button>
                                    </form>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </main>
    );
}
