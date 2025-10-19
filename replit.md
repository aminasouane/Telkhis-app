# Takhleesly - Audio Transcription and Summarization App

## Overview

Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages OpenAI's Whisper for transcription and GPT-4 for intelligent summarization. 

**Current Status**: The application features a complete trial system with **7-day free access (1 summary per day, max 5 minutes per recording)**. A subscription page UI is ready for Stripe integration. Email verification is temporarily disabled pending payment gateway implementation. The project implements a freemium model where trial users access the app for free, then must subscribe via Stripe to continue using the service.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing**: React with TypeScript and Vite; Wouter for lightweight client-side routing, supporting `/login`, `/`, `/history`, and 404 pages. Protected routes redirect unauthenticated users.

**UI Component System**: Radix UI with shadcn/ui patterns, Material Design 3 inspired (cyan primary, hue 180°). Custom theming with CSS variables for light/dark modes. RTL-first design with Arabic typography (Noto Kufi Arabic + Inter fallback) and Tailwind CSS.

**State Management**: TanStack Query for server state, local React state for UI. Context APIs manage theme, language, and authentication. Supabase database stores session history.

**Key Design Decisions**:
- **Progressive Disclosure Workflow**: Guides users through language selection, recording/upload, transcription, and summarization.
- **Multi-language Support**: Arabic (Classical), French (Academic), and Algerian dialect (converted to Classical Arabic for clarity). Dynamic RTL/LTR switching.
- **Live Summary Feature**: Real-time transcription and partial summarization during recording (updates every 15 seconds).
- **Save & Share Feature**: Export summaries as TXT or PDF (with RTL support) and copy to clipboard. Native Web Share API integration with fallbacks.
- **Screen Separation**: Dedicated Home page for recording/upload, History page for session management, and Subscribe page for payment/upgrade.
- **Session Management**: Sessions (id, user_id, title, date, language, content, transcript, key_points) are stored in a Supabase database. User-scoped queries ensure data security.
- **Authentication & Authorization**: 
  - Supabase Auth with email/password and Google OAuth
  - **Login page** is for existing paid users only (no signup tab)
  - **Email verification temporarily disabled** pending Stripe integration
  - Guest mode allows trial access without account creation
- **Trial System & Subscription Flow**: 
  - **All new users** start as guests with **7-day free trial** (1 summary/day, 5 min/recording)
  - Trial subscription auto-created with `trial_end_date` set to 23:59:59 on day 7
  - **After trial expires**: Users redirected to `/subscribe` page
  - **Subscription page** displays pricing plans (UI ready, Stripe integration pending)
  - **Future flow**: Stripe Checkout → Webhook creates Supabase account → User gains full access
  - Guest data automatically migrates to paid account after payment
- **Print Feature**: Print-friendly styling with automatic print trigger via URL parameter `?print=true`.

### Backend Architecture

**Runtime & API**: Node.js with Express.js, offering RESTful endpoints.
- `/api/health`: Health check.
- `/api/process-audio-live`: Real-time transcription/summarization during recording.
- `/api/process-audio`: Main audio processing (transcription, summarization).
- **Secure Guest & User Management APIs**:
  - `POST /api/guest-session`: Creates guest user with trial subscription (server-side only)
  - `GET /api/trial-status`: Returns trial status (expired, summaries used, days remaining)
  - `POST /api/save-summary`: Saves summary with atomic trial enforcement
  - `GET /api/summaries`: Lists user summaries with authorization
  - `DELETE /api/summaries/:id`: Deletes summary with ownership verification
  - `POST /api/migrate-guest`: Migrates guest data to authenticated account
  - `POST /api/user/upsert`: Creates/updates user data and automatically creates trial subscription for new users
  - `GET /api/user/settings`: Retrieves user settings
  - `POST /api/user/settings`: Updates user settings

**File Handling**: Multer middleware for in-memory audio file processing (max 25MB, specific MIME types).

**Audio Processing Pipeline**:
1. Audio file and language received via `/api/process-audio` or `/api/process-audio-live`.
2. **Server-Side Duration Calculation**: Uses `music-metadata` library to parse audio buffer and extract duration metadata.
3. **Pre-Processing Validation**: 
   - Hard-fail if metadata parsing fails (422 error)
   - Hard-fail if duration missing from metadata (422 error)
   - Hard-fail if duration exceeds 300 seconds (403 error) **BEFORE** calling OpenAI APIs
4. Transcription via OpenAI Whisper API (language-specific settings).
5. Summarization via GPT-4o-mini with language-specific prompts (Classical Arabic, Academic French; Algerian dialect converted to simplified Classical Arabic).
6. Returns structured JSON with: transcription, summary, keyPoints, **server-calculated audioDuration**, and **server-issued processedAt timestamp**.

**Security Architecture - Multi-Layer Defense**:

**Primary Enforcement Layer** (Audio Processing):
- **Server-Side Duration Calculation**: All audio files are parsed with `music-metadata` to extract true duration from file metadata
- **Hard-Fail on Parse Errors**: Malformed or unsupported files are rejected (422) before processing
- **Pre-AI Validation**: Duration limit (300s) enforced BEFORE expensive OpenAI API calls to prevent cost abuse
- **Trusted Metadata**: Server returns `audioDuration` + `processedAt` timestamp that client cannot spoof
- **Both Endpoints Protected**: Identical validation on `/api/process-audio` and `/api/process-audio-live` prevents bypass

**Defense-in-Depth Layer** (Summary Persistence):
- **Required Timestamp**: `/api/save-summary` mandates `processedAt` field from processing endpoints
- **Freshness Validation**: Rejects summaries processed >5 minutes ago (anti-replay protection)
- **Clock Skew Protection**: Rejects future timestamps >1 minute ahead
- **Sanity Checks**: Validates transcript length correlates with duration (~1.5 words/sec minimum)
- **Secondary Duration Check**: Enforces 300s limit again as defense-in-depth
- **Trial Enforcement**:
  - **Daily Limit**: 1 summary per day (tracked via `last_summary_date` in subscriptions table)
  - **Period Limit**: Trial expires after 7 days from first use
  - Checks happen AFTER duration validation to ensure consistent enforcement

**Additional Security Measures**:
- **Backend-Mediated Design**: All Supabase operations use `SUPABASE_SERVICE_ROLE_KEY` on server only
- **Zero Frontend Exposure**: Frontend has no direct Supabase access for sensitive operations
- **Atomic Operations**: Summary save + trial increment use PostgreSQL RPC function to prevent race conditions
- **Authorization**: Every request verifies user ownership
- **RLS Policies**: Row Level Security enforces data isolation at database level

### Data Storage Solutions

**Database**: PostgreSQL (via Neon serverless) with Drizzle ORM.
- **Supabase**: Primary database for users, subscriptions, summaries, and settings.
  - Tables: `users`, `subscriptions`, `summaries`, `settings`.
  - **subscriptions** table includes:
    - `trial_summaries_used`: Total summaries created (incremented atomically)
    - `trial_summaries_limit`: Set to 1 for daily limit enforcement
    - `last_summary_date`: DATE field tracking the last day a summary was created
    - `trial_end_date`: Trial expiration date (7 days from first use, ends at 23:59:59)
    - **Stripe fields (ready for integration)**:
      - `stripe_customer_id`: TEXT UNIQUE - Stripe customer ID (cus_xxx)
      - `stripe_subscription_id`: TEXT UNIQUE - Stripe subscription ID (sub_xxx)
      - `stripe_price_id`: TEXT - Stripe price ID (price_xxx)
  - **summaries** table includes:
    - `audio_duration`: INTEGER field storing recording duration in seconds
  - Relations: User IDs are foreign keys in `subscriptions`, `summaries`, and `settings`, with CASCADE DELETE.
  - Indexed columns for query optimization (including `last_summary_date`, `stripe_customer_id`, `stripe_subscription_id`).
  - RLS policies enforce user data ownership.
  - **Migration script** available: `database/migrations/add_stripe_fields.sql`

## External Dependencies

### AI/ML Services

- **OpenAI API**:
  - **Whisper-1**: Multi-language audio transcription (Arabic, French).
  - **GPT-4o-mini**: Language-specific text summarization and key point extraction (Classical Arabic, Academic French, Algerian dialect converted to simplified Classical Arabic).
  - Uses official OpenAI Node.js SDK.

### Database Services

- **Neon Database**: Serverless PostgreSQL for core database needs (connection via `@neondatabase/serverless`).
- **Supabase**: PostgreSQL, Authentication, and Storage. Used for user management, session history, and RLS.

### Backend Libraries

- **music-metadata**: Server-side audio file metadata parsing for duration extraction and validation.

### Frontend Libraries

- **Media Recording API**: Browser native for audio capture and recording state management.
- **Google Fonts CDN**: Multi-language typography (Noto Kufi Arabic + Inter).
- **jsPDF**: PDF generation.
- **html2canvas**: Capturing HTML content for PDF export (with RTL/Arabic support).
- **Clipboard API**: Copy-to-clipboard functionality.
- **date-fns**: Timestamp formatting.

## Security Notes

**Duration Limit Enforcement**:
The 5-minute recording limit is enforced through a multi-layer security approach:
1. **Client-side UX**: Frontend pre-calculates duration for uploads to show early warnings (user experience)
2. **Server-side Primary**: Backend parses audio metadata and rejects >300s files before OpenAI processing (cost protection)
3. **Server-side Defense-in-Depth**: Save endpoint validates duration + freshness + sanity checks (anti-tampering)

This design prevents attackers from bypassing limits via:
- Oversized file uploads (rejected at parse time)
- Malformed files (hard-fail on metadata errors)
- Forged duration values (server always calculates from buffer)
- Replay attacks (5-minute freshness window)
- Live endpoint bypass (both endpoints equally protected)

## 🚀 Next Steps: Stripe Integration

The application is **ready for Stripe integration**. All infrastructure is in place:

### Completed Preparation:
- ✅ Database schema updated with Stripe fields (`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`)
- ✅ Migration script ready: `database/migrations/add_stripe_fields.sql`
- ✅ Subscribe page UI complete (`/subscribe`) with pricing plans
- ✅ Trial system fully functional with automatic expiry and redirection
- ✅ Email verification disabled (will re-enable post-payment via webhook)
- ✅ Login page simplified (signup removed, existing users only)
- ✅ Guest-to-paid migration infrastructure ready

### Required for Stripe Integration:

**1. Stripe Account Setup**:
- Create Stripe account at https://dashboard.stripe.com
- Get API keys:
  - `VITE_STRIPE_PUBLIC_KEY` (starts with `pk_`) - Public key for frontend
  - `STRIPE_SECRET_KEY` (starts with `sk_`) - Secret key for backend
- Create product(s) in Stripe Dashboard with pricing:
  - Monthly plan: $9.99/month
  - Yearly plan: $99.99/year
- Get `STRIPE_PRICE_ID` for each plan (starts with `price_`)

**2. Implementation Steps**:
1. **Install Stripe Blueprint**: Use `blueprint:javascript_stripe` integration
2. **Add API Endpoints**:
   - `POST /api/create-checkout-session`: Creates Stripe Checkout session
   - `POST /api/stripe-webhook`: Handles payment events
3. **Webhook Events to Handle**:
   - `checkout.session.completed`: Create Supabase user account after successful payment
   - `customer.subscription.updated`: Update subscription status
   - `customer.subscription.deleted`: Handle cancellations
4. **Update Subscribe Page**: Connect UI to Stripe Checkout API
5. **Test Flow**:
   - Trial user → Trial expires → Subscribe page → Stripe Checkout → Webhook creates account → User logs in → Full access

**3. Security Considerations**:
- Webhook signature verification (Stripe provides `STRIPE_WEBHOOK_SECRET`)
- Server-side validation of all payment data
- Atomic database operations (user creation + subscription + guest data migration)
- Proper error handling and rollback on failures

### Files Ready for Stripe Integration:
- `client/src/pages/Subscribe.tsx` - UI ready, needs Stripe Elements integration
- `database/migrations/add_stripe_fields.sql` - Run this migration first
- `server/routes.ts` - Add Stripe endpoints here
- Reference blueprint code available in `blueprint:javascript_stripe`

## Recent Fixes (October 2025)

### Trial Subscription Display Issue (Fixed - October 19, 2025):
- **Problem**: Subscription modal appeared immediately after first login for authenticated users, despite active trial period
- **Root Causes**: 
  1. Trial subscription was only created for guest users, not authenticated users
  2. Frontend only checked trial status for guest users
  3. Trial end date was set to exact time instead of end of day
  4. Date comparison used `<=` which expired trials at start of last day
- **Solutions**: 
  - Modified `/api/user/upsert` to automatically create trial subscription for new authenticated users
  - Updated `Home.tsx` to check trial status for ALL users (not just guests)
  - Set `trial_end_date` to end of 7th day (23:59:59) instead of exact signup time
  - Changed date comparison to use `<` instead of `<=` to give full last day access
  - Improved days remaining calculation with explicit UTC handling
- **Impact**: All new users now receive full 7-day trial (ending at 23:59:59 on day 7) regardless of authentication method

### Authentication & Subscription Flow Restructure (October 19, 2025):
- **Changes Made**:
  1. **Login Page Simplified**: Removed signup tab - now only for existing paid users
  2. **Email Verification Disabled**: Temporarily disabled pending Stripe integration
  3. **Subscribe Page Created**: New `/subscribe` route with pricing UI (Monthly $9.99, Yearly $99.99)
  4. **Database Schema Updated**: Added Stripe fields to subscriptions table
  5. **Trial Flow Updated**: TrialExpiredModal now redirects to `/subscribe` instead of `/login`
  6. **Documentation Added**: Complete Stripe integration guide in replit.md
- **Current User Flow**:
  - New visitors → Guest mode (7-day trial) → Trial expires → `/subscribe` page → (Stripe integration pending)
  - Existing users → `/login` → Full access (if active subscription)
- **Ready for**: Stripe API integration to enable actual payments and account creation