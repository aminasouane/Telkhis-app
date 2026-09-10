import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  const { data } = await supabase.from('usage').select('*');
  console.log('Usage records:', data?.length);
  if (data?.length) {
    const dates = data.map((x: any) => x.date);
    dates.sort();
    console.log('Earliest date:', dates[0]);
    console.log('Latest date:', dates[dates.length - 1]);
  }
}
main().catch(console.error);
