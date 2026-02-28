import { supabaseAdmin } from "./server/supabase-admin.js";

async function createAdmin() {
    const email = "testadmin2@example.com";
    const password = "Password123!";

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: "Test Admin" },
    });

    if (authError) {
        if (authError.message.includes("already registered")) {
            console.log("User already exists in Auth, trying to fetch...");
        } else {
            console.error("Auth Error:", authError);
            return;
        }
    }

    // Find the exact user ID just in case it already existed
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = users.users.find((u) => u.email === email);

    if (!testUser) {
        console.error("User not found!");
        return;
    }

    // 2. Ensure they exist in our public.users table with role 'admin'
    const { error: dbError } = await supabaseAdmin
        .from("users")
        .upsert({
            id: testUser.id,
            email: testUser.email,
            name: "Test Admin",
            role: "admin",
            user_type: "free",
            subscription_type: "free",
        }, { onConflict: "id" });

    if (dbError) {
        console.error("Database Error:", dbError);
        return;
    }

    console.log("Admin user created/updated successfully! Email:", email);
}

createAdmin();
