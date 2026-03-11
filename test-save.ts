import * as db from './server/db.js';
import { supabaseAdmin } from './server/supabase-admin.js';

async function testSave() {
  const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
  if (!users || users.length === 0) {
    console.error("No users found in database to test with.");
    return;
  }
  const testUserId = users[0].id;
  console.log("Testing with user ID:", testUserId);
  try {
    console.log("Saving test summary...");
    const result = await db.saveSummary({
      userId: testUserId,
      title: "Test Summary Debug",
      content: "This is a test content from debugger",
      transcript: "This is a test transcript",
      keyPoints: ["Point 1", "Point 2"],
      language: "ar",
      audioDuration: 120
    });
    console.log("✅ Success:", result);
    
    // Clean up
    await db.deleteSummary(result.id, testUserId);
    console.log("Cleanup done.");
  } catch (err: any) {
    console.error("❌ Failed to save summary:", err.message);
  }
}

testSave().then(() => process.exit(0));
