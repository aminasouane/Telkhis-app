import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'TRIAL_LIMITS',
      value: { MAX_AUDIO_MINUTES: 900, DAILY_LIMIT_MINUTES: 30, VALIDITY_DAYS: 30, MAX_FILE_DURATION_SECONDS: 300 },
      description: 'Trial plan limits'
    }, { onConflict: 'key' });

  if (error) console.error("Error:", error);
  else console.log("Success updated trial limits.");
}
main().catch(console.error);
