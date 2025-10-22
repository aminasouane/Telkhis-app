# Takhleesly - Audio Transcription and Summarization App

## Overview
Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages OpenAI's Whisper for transcription and GPT-4 for intelligent summarization. It operates on a freemium model, offering a **one-time 30-minute audio trial** before requiring a subscription.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React, TypeScript, and Vite, using Wouter for routing. UI components are based on Radix UI with shadcn/ui patterns, inspired by Material Design 3, featuring a cyan primary color and RTL-first design with Arabic typography. State management utilizes TanStack Query for server state and React Context for UI, theme, language, and authentication. Key design decisions include a progressive disclosure workflow, multi-language support with dynamic RTL/LTR switching, a live summary feature, save/share functionalities (TXT, PDF, Web Share API), and distinct pages for home, history, and subscription. Session management and user authentication are handled via Supabase Auth, with a trial system that transitions users to a subscription page upon expiry.

### Backend Architecture
The backend uses Node.js with Express.js, providing RESTful endpoints for health checks, audio processing (live and batch), and secure guest/user management. It employs Multer for in-memory audio file handling. The audio processing pipeline involves server-side duration calculation (using `music-metadata`), pre-processing validation (e.g., duration limits before OpenAI API calls), transcription via OpenAI Whisper, and summarization via GPT-4o-mini. The system incorporates a multi-layered security architecture with server-side duration enforcement, pre-AI validation, trusted metadata, and defense-in-depth for summary persistence, including freshness and sanity checks, and atomic trial enforcement.

### Data Storage Solutions
The project uses PostgreSQL (via Neon serverless) with Drizzle ORM, primarily through Supabase. Tables include `users`, `subscriptions`, `summaries`, and `settings`. The `subscriptions` table tracks trial usage, limits, and expiration, and is prepared with fields for Stripe integration. All sensitive Supabase operations are mediated by the backend using `SUPABASE_SERVICE_ROLE_KEY`, enforcing RLS policies for data isolation.

## External Dependencies

### AI/ML Services
- **OpenAI API**: Utilized for:
    - **Whisper-1**: Multi-language audio transcription.
    - **GPT-4o-mini**: Language-specific text summarization and key point extraction.

### Database Services
- **Neon Database**: Provides serverless PostgreSQL.
- **Supabase**: Used for PostgreSQL database, authentication, and storage.

### Backend Libraries
- **music-metadata**: For server-side audio file metadata parsing and duration extraction.

### Frontend Libraries
- **Media Recording API**: Native browser API for audio capture.
- **Google Fonts CDN**: For multi-language typography.
- **jsPDF** and **html2canvas**: For PDF generation and HTML content capture.
- **Clipboard API**: For copy-to-clipboard functionality.
- **date-fns**: For date and time formatting.

## Recent Changes (October 19, 2025)

### Trial Status Bug Fix
**Problem**: Subscribe page appeared immediately for users with active trial periods, even though they had 7 days remaining.

**Root Causes**:
1. `server/middleware/trialGuard.ts` returned `isExpired: true` when no subscription record was found (affecting new users)
2. `/api/trial-status` didn't provide explicit `isTrialActive` flag for frontend
3. Subscribe page had no trial status validation before rendering content

**Solutions Implemented**:
1. **Backend Fix** (`server/middleware/trialGuard.ts` lines 29-51):
   - When subscription not found → return active 7-day trial instead of marking as expired
   - Prevents premature expiration for newly created users
   - Trial subscription is created asynchronously by `/api/user/upsert`

2. **API Enhancement** (`server/api/trial-status.ts` lines 16-24):
   - Added `isTrialActive` boolean: `!isExpired && daysRemaining > 0`
   - Added `hasActiveSubscription` boolean (false for trial users, true for paid)
   - Provides clear flags for frontend decision-making

3. **Frontend Guard** (`client/src/pages/Subscribe.tsx` lines 77-102):
   - Added useEffect to check trial status on page load
   - Users with active trial automatically redirected to home page
   - Error handling prevents infinite loading state (fail-open approach)
   - Loading indicator shown during trial status verification

**Tested Scenarios**:
- ✅ New user with no subscription → Granted access, trial starts
- ✅ User with active trial (days > 0) → Access granted, redirected from /subscribe
- ✅ User with expired trial (days = 0) → Shown Subscribe page
- ✅ Direct navigation to /subscribe with active trial → Auto-redirected to home

**Impact**: Subscribe page now only displays after trial genuinely expires (all 7 days used).

## Recent Changes (October 22, 2025)

### Trial System Migration: 7-Day → 30-Minute Audio Trial

**Change Summary**: Migrated trial system from time-based (7 days) to usage-based (30 minutes of audio transcription).

**Business Logic:**
- **Before**: Users had 7 days to use the app with 1 summary per day
- **After**: Users have one-time trial allowing up to 30 minutes of audio transcription total (no time limit)

**Database Changes:**
1. **New Migration** (`database/migrations/add_trial_minutes_fields.sql`):
   - Added `trial_minutes_used NUMERIC(10,2)` - tracks total audio minutes used
   - Added `trial_minutes_limit NUMERIC(10,2)` - max allowed (30.0)
   - Created indexes for faster queries
   - Updated database functions:
     - `is_trial_expired()` - now checks minutes instead of dates
     - `increment_trial_minutes(user_id, minutes)` - replaces daily summary increment

**⚠️ MIGRATION REQUIRED**: User must run `database/migrations/add_trial_minutes_fields.sql` in Supabase SQL Editor before this system works.

**Backend Changes:**
1. **`server/middleware/trialGuard.ts`**:
   - `TrialInfo` interface updated: removed `daysRemaining`, `summariesUsed/Limit`, added `minutesUsed/Limit/Remaining`
   - `checkTrialStatus()` - now queries `trial_minutes_used/limit` instead of dates
   - `incrementTrialMinutes(userId, minutes)` - replaces `incrementTrialUsage()`
   - Trial expires when `minutesUsed >= minutesLimit` (30.0)

2. **`server/api/trial-status.ts`**:
   - Returns `minutesRemaining` instead of `daysRemaining`
   - `isTrialActive = !isExpired && minutesRemaining > 0`

3. **`server/api/guest-session.ts`**:
   - Initializes trial with `trial_minutes_limit: 30.0` instead of 7-day expiry date
   - Removed `trial_end_date`, `trial_summaries_used/limit` fields

4. **`server/api/save-summary.ts`**:
   - Converts `audioDuration` (seconds) → minutes: `audioMinutes = (audioDuration / 60).toFixed(2)`
   - Checks if `minutesUsed + audioMinutes > minutesLimit` before saving
   - Calls `incrementTrialMinutes(userId, audioMinutes)` after successful save
   - Error message shows remaining minutes: "هذا التسجيل (X دقيقة) سيتجاوز حد التجربة المجانية"

**Frontend Changes:**
1. **`client/src/services/trialService.ts`**:
   - `TrialStatus` interface: replaced `daysRemaining`, `summariesUsed/Limit` with `minutesUsed/Limit/Remaining`
   - `GuestSessionResponse`: updated to use `trial_minutes_used/limit`

2. **`client/src/components/TrialExpiredModal.tsx`**:
   - Props changed from `(summariesUsed, summariesLimit, daysRemaining)` → `(minutesUsed, minutesLimit)`
   - Message: "لقد استخدمت كامل التجربة المجانية (30 دقيقة صوت)"
   - Display: "استخدامك: X.X من 30.0 دقيقة"
   - Removed "تسجيل الدخول" button (trial is usage-based, not account-based)

3. **`client/src/pages/Subscribe.tsx`**:
   - Badge text: "انتهت التجربة المجانية (30 دقيقة)"
   - Trial check: `status.minutesRemaining > 0` instead of `daysRemaining > 0`

4. **`client/src/pages/Home.tsx`**:
   - State: `trialInfo = { minutesUsed, minutesLimit }` instead of `{ used, limit, daysRemaining }`
   - Updated all trial status handlers to use minutes

**Security Considerations:**
- ✅ Server-side duration calculation using `music-metadata` in `/api/process-audio`
- ✅ Freshness check: `processedAt` must be < 5 minutes old
- ✅ Sanity check: transcript length correlates with duration
- ⚠️ **Known Limitation (MVP)**: Client can still tamper with `audioDuration` in `/api/save-summary` request. While sanity checks help, a sophisticated attacker could forge both `audioDuration` and matching transcript.
  
**Recommended Security Enhancements (Future):**
1. Persist server-calculated duration in database during `/api/process-audio`
2. Link summary save requests to processing session with signed token
3. Add server-side RPC function to enforce trial limits atomically
4. Implement rate limiting on trial endpoints

**User Flow:**
1. New guest → Creates session → `trial_minutes_used: 0, trial_minutes_limit: 30`
2. User transcribes 10-minute audio → `trial_minutes_used: 10.0`
3. User tries 25-minute audio → ❌ Rejected: "سيتجاوز حد التجربة المجانية (20.0 دقيقة متبقية)"
4. User uses remaining 20 minutes → `trial_minutes_used: 30.0` → Trial expired
5. TrialExpiredModal shown → Navigate to `/subscribe`

**Testing Scenarios:**
- ✅ New user: Gets 30-minute trial, can transcribe audio until limit
- ✅ User at 25 minutes used: Can transcribe 5-minute audio, blocked on 10-minute audio
- ✅ User at 30 minutes: Trial expired modal shown, redirected to subscribe
- ✅ UI displays correct minutes remaining throughout app
- ⚠️ Database migration NOT YET RUN - fields don't exist yet, causing errors in logs

**Current Status:**
- ✅ All code updated (backend + frontend)
- ✅ Migration script created (`add_trial_minutes_fields.sql`)
- ⚠️ **User action needed**: Run migration in Supabase SQL Editor
- ✅ No runtime errors (except database fields missing until migration runs)