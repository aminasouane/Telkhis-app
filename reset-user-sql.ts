import { pool } from './server/db';

async function reset() {
    try {
        const res = await pool.query('SELECT u.id FROM users u JOIN auth_users a ON u.auth_user_id = a.id WHERE a.email = $1', ['yacinepes1@gmail.com']);

        if (res.rows.length === 0) {
            console.log('User not found');
            return;
        }

        const userId = res.rows[0].id;
        console.log(`Found user: ${userId}`);

        await pool.query('UPDATE users SET subscription_id = NULL, minutes_used = 0, daily_minutes_used = 0 WHERE id = $1', [userId]);
        await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);

        console.log('Reset successful');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

reset();
