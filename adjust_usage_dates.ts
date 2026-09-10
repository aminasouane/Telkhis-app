import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  const targetDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log('Target date (7 days ago):', targetDateStr);
  
  // 1. Get all unique users who have usage
  const { data: usageData, error } = await supabase.from('usage').select('*');
  if (error) throw error;
  
  const usersAffected = new Set<string>();
  
  // Group usage by user_id
  const usageByUser = new Map<string, any[]>();
  for (const row of usageData) {
    if (!usageByUser.has(row.user_id)) usageByUser.set(row.user_id, []);
    usageByUser.get(row.user_id)!.push(row);
  }
  
  // For each user
  for (const [userId, rows] of usageByUser.entries()) {
    // Sort by date ascending
    rows.sort((a, b) => a.date.localeCompare(b.date));
    
    const earliestDateStr = rows[0].date;
    
    // If their earliest date is older than 7 days ago
    if (earliestDateStr < targetDateStr) {
      usersAffected.add(userId);
      console.log(`User ${userId} started on ${earliestDateStr}. Restoring to ${targetDateStr}.`);
      
      // Sum all minutes used for dates before targetDateStr
      let sumMinutes = 0;
      const rowIdsToDelete: string[] = [];
      const rowsToUpdate: any[] = [];
      
      for (const row of rows) {
        if (row.date < targetDateStr) {
          sumMinutes += (row.minutes_used || 0);
          rowIdsToDelete.push(row.id); // Assuming usage has 'id' column
        }
      }
      
      // Let's check if they already have a row on targetDateStr
      const targetRow = rows.find(r => r.date === targetDateStr);
      
      // If we don't have row ID, we delete by user_id and date
      
      // 1. Delete all old rows
      for (const row of rows) {
        if (row.date < targetDateStr) {
           await supabase.from('usage').delete().eq('user_id', userId).eq('date', row.date);
        }
      }
      
      // 2. Add those minutes to targetDate row, or create a targetDate row
      if (targetRow) {
         await supabase.from('usage')
            .update({ minutes_used: targetRow.minutes_used + sumMinutes })
            .eq('user_id', userId)
            .eq('date', targetDateStr);
      } else {
         await supabase.from('usage')
            .insert({ user_id: userId, date: targetDateStr, minutes_used: sumMinutes });
      }
    }
  }
  
  console.log(`Updated ${usersAffected.size} users to have 23 days left!`);
}

main().catch(console.error);
