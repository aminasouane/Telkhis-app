import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reset() {
    console.log('Finding user yacinepes1@gmail.com...');
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'yacinepes1@gmail.com')
        .limit(1);

    if (userError) {
        console.error('Error finding user:', userError);
        return;
    }

    const user = users[0];
    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log(`Found user ${user.id}, resetting...`);

    const { error: subError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id);
    if (subError) console.error('Error deleting subscriptions:', subError);

    const { error: usageError } = await supabase
        .from('usage')
        .delete()
        .eq('user_id', user.id);
    if (usageError) console.error('Error deleting usage:', usageError);

    const { error: updateError } = await supabase
        .from('users')
        .update({ subscription_type: 'free', user_type: 'free' })
        .eq('id', user.id);

    if (updateError) {
        console.error('Error updating user:', updateError);
    } else {
        console.log('User successfully reset to free plan!');
    }
}

reset();
