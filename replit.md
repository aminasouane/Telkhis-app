# Takhleesly - Audio Transcription and Summarization App

## Overview

Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages OpenAI's Whisper for transcription and GPT-4 for intelligent summarization. A key feature is a "soft authentication" trial system, offering guests **1 free summary per day for 7 days** (max 5 minutes per recording), with seamless data migration upon signup. The project aims to provide an accessible and efficient summarization tool for academic and professional use, with robust multi-language support and user-friendly design.

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
- **Screen Separation**: Dedicated Home page for recording/upload and History page for session management.
- **Session Management**: Sessions (id, user_id, title, date, language, content, transcript, key_points) are stored in a Supabase database. User-scoped queries ensure data security.
- **Authentication**: Supabase Auth with email/password and Google OAuth. All pages require authentication, redirecting to `/login` if not authenticated.
- **Trial System**: **All new users** (both guest and authenticated) get **1 free summary per day for 7 days** with a maximum recording duration of **5 minutes** per session. Trial subscription is automatically created upon first login/signup. Trial checks (daily limit, duration limit, and period expiry) are enforced server-side before AI processing. Guest data migrates upon signup.
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
    - `trial_end_date`: Trial expiration date (7 days from first use)
  - **summaries** table includes:
    - `audio_duration`: INTEGER field storing recording duration in seconds
  - Relations: User IDs are foreign keys in `subscriptions`, `summaries`, and `settings`, with CASCADE DELETE.
  - Indexed columns for query optimization (including `last_summary_date`).
  - RLS policies enforce user data ownership.

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

## Recent Fixes (October 2025)

**Trial Subscription Display Issue** (Fixed):
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