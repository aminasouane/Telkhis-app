import { supabaseAdmin } from "./server/supabase-admin.js";

async function checkAdmin() {
    const { data: users, error } = await supabaseAdmin
        .from("users")
        .select("id, email, role")
        .eq("email", "testadmin2@example.com");

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log("DB Data:", users);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = authUser?.users?.find(u => u.email === "testadmin2@example.com");

    console.log("Auth Data ID:", testUser?.id);
}
checkAdmin();
