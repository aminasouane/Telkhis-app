# Supabase Database Setup Instructions

## Prerequisites

- A Supabase account (free tier works fine)
- Access to your Supabase project dashboard

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose a project name (e.g., "takhleesly")
5. Set a database password (save it securely!)
6. Select a region close to your users
7. Click "Create new project"

## Step 2: Run Database Setup Script

1. In your Supabase project dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `database/complete_supabase_setup.sql` from this project
4. Copy the entire SQL script
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** or press `Ctrl/Cmd + Enter`
7. Wait for the script to complete (you should see "Success" message)

## Step 3: Get Your API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Find these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

## Step 4: Configure Environment Variables in Replit

1. In your Replit project, go to **Tools** → **Secrets**
2. Add the following secrets:
   - Key: `VITE_SUPABASE_URL`
     Value: Your Project URL from Step 3
   - Key: `VITE_SUPABASE_ANON_KEY`
     Value: Your anon public key from Step 3

## Step 5: Verify Setup

1. Restart your Replit application
2. Open the app in the browser
3. The app should now work without database errors
4. Try creating a summary to test the database connection

## Troubleshooting

### Error: "Could not find the table 'public.users'"
- Make sure you ran the complete SQL script in Step 2
- Check that all tables were created successfully in Supabase dashboard → **Table Editor**

### Error: "Invalid API key"
- Verify that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set in Replit Secrets
- Make sure there are no extra spaces in the values
- Restart the Replit application after setting secrets

### Guest users not working
- Make sure the SQL script created the `users` table with `device_id` column
- Check browser console for errors
- Verify that the `users` table allows NULL email values

## Database Tables Created

The setup script creates these tables:

1. **users** - User accounts (guests and authenticated)
2. **subscriptions** - Subscription plans with trial support
3. **summaries** - Audio transcription summaries
4. **settings** - User preferences

## Trial System Features

- New users start as **guests** with automatic trial
- Trial limits: **10 summaries** OR **7 days** (whichever comes first)
- When trial expires, users are prompted to sign up
- Upon signup, all guest data is migrated to the authenticated account

## Security Notes

- Row Level Security (RLS) is **disabled** for simplicity
- Security is enforced at the application level
- All operations verify user_id to prevent unauthorized access
- Guest users are identified by device_id stored in localStorage
