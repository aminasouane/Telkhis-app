import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Debug logging (remove in production)
console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Service Key configured:", !!supabaseServiceKey);
console.log("Supabase URL value:", supabaseUrl);
console.log("Service Key length:", supabaseServiceKey?.length || 0);
console.log("Service Key starts with:", supabaseServiceKey?.substring(0, 20) + "...");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Admin client with service role key - NEVER expose to frontend
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
