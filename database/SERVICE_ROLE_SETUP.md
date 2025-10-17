# Supabase Service Role Key Setup

## Overview

The backend requires a **Service Role Key** from Supabase to perform admin operations like creating guest users and managing trial subscriptions. This key bypasses Row Level Security (RLS) and should be kept secret.

## How to Get Your Service Role Key

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project: **Takhleesly**

2. **Navigate to API Settings**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **API** in the settings menu

3. **Copy the Service Role Key**
   - Scroll down to the **Project API keys** section
   - Find the **service_role** key (marked as "secret")
   - Click the **Copy** button next to it
   - ⚠️ **Important**: This is a SECRET key - never expose it in client code or commit it to git

## How to Add Key to Replit Secrets

1. **Open Replit Secrets**
   - In Replit, click on the **Tools** button in the left sidebar
   - Select **Secrets** from the menu

2. **Add the Service Role Key**
   - Click **+ New Secret**
   - Key name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Paste the service role key you copied from Supabase
   - Click **Add Secret**

3. **Restart the Application**
   - The workflow will automatically restart
   - The backend will now be able to create guest users and manage trials

## Verify It's Working

After adding the key:

1. **Check the Logs**
   - Look for `Error: Invalid API key` in the logs
   - If you still see this error, double-check that you copied the **service_role** key (not the anon key)

2. **Test Guest Flow**
   - Open the app in your browser
   - It should automatically create a guest session
   - You should see trial info (10 summaries, 7 days remaining)

## Security Notes

- ✅ **Service role key is stored in Replit Secrets** (encrypted, never exposed)
- ✅ **Service role key is only used on the backend** (never sent to client)
- ✅ **Backend enforces trial limits before AI processing** (prevents bypass)
- ✅ **RLS will be enabled after testing** (additional security layer)
- ✅ **All operations verify user ownership** (prevents unauthorized access)

## Troubleshooting

### Error: "Invalid API key"
- Make sure you copied the **service_role** key (not the anon key)
- The service_role key starts with `eyJ...` and is much longer than the anon key
- Verify there are no extra spaces before/after the key in Replit Secrets

### Error: "Failed to create guest session"
- Check that SUPABASE_URL is also set in Replit Secrets
- Verify your Supabase project is not paused or deleted
- Check Supabase dashboard for any service disruptions

### Guest users not being created
- Verify the database tables exist (run `database/complete_supabase_setup.sql`)
- Check that the `users` and `subscriptions` tables have the correct schema
- Look for error messages in the server logs
