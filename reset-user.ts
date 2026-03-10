import * as db from './server/db';
import { users, subscriptions } from './shared/schema';
import { eq } from 'drizzle-orm';

async function resetUser() {
    const allUsers = await db.db.query.users.findMany({
        with: { authUser: true }
    });

    const user = allUsers.find(u => u.authUser?.email === 'yacinepes1@gmail.com');

    if (!user) {
        console.log('User not found');
        return;
    }

    await db.db.update(users)
        .set({
            subscriptionId: null,
            minutesUsed: 0,
            dailyMinutesUsed: 0
        })
        .where(eq(users.id, user.id));

    await db.db.delete(subscriptions).where(eq(subscriptions.userId, user.id));

    console.log('User subscription reset successfully.');
}

resetUser().catch(console.error).finally(() => process.exit(0));
