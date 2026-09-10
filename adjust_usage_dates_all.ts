import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  const targetDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log('Target date (7 days ago):', targetDateStr);
  
  const { data: usageData, error } = await supabase.from('usage').select('*');
  if (error) throw error;
  
  const usageByUser = new Map<string, any[]>();
  for (const row of usageData) {
    if (!usageByUser.has(row.user_id)) usageByUser.set(row.user_id, []);
    usageByUser.get(row.user_id)!.push(row);
  }
  
  let updatedCount = 0;
  for (const [userId, rows] of usageByUser.entries()) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const earliestDateStr = rows[0].date;
    
    // We want everyone's earliest date to be targetDateStr (except if they started more recently and we just leave them alone? The prompt says "give it a free period as if they registered 7 days ago meaning they have 23 days left" for accounts that "had its free trial expire")
    // Wait, if it didn't expire yet, do we give them 23 days ? No, "اي حساب موجود وانتهت له الفترة المجانية" means "any existing account that had its free trial expire". 
    // And earlier it says "هل الحسابات الحالية التي في التجربة المجانية غيرت لهم ايضا ام لا لاني اريد منك ان تغير لهم ايضا" (Did you change for the current accounts too or not because I want you to change them too)
    // The previous run returned 0. So no one was older than 7 days anyway. All existing users are within the last 7 days!
  }
  console.log('No one is older than 7 days ago except maybe someone in subscriptions table?');
}

main().catch(console.error);
