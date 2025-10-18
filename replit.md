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
- **Trial System**: Guest users get **1 free summary per day for 7 days** with a maximum recording duration of **5 minutes** per session. Trial checks (daily limit, duration limit, and period expiry) are enforced server-side before AI processing. Data migrates upon signup.
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
  - `POST /api/user/upsert`: Creates/updates user data
  - `GET /api/user/settings`: Retrieves user settings
  - `POST /api/user/settings`: Updates user settings

**File Handling**: Multer middleware for in-memory audio file processing (max 25MB, specific MIME types).

**Audio Processing Pipeline**:
1. Audio file and language received.
2. Transcription via OpenAI Whisper API (language-specific settings).
3. Summarization via GPT-4o-mini with language-specific prompts (Classical Arabic, Academic French; Algerian dialect converted to simplified Classical Arabic).
4. Returns structured JSON response.

**Security Architecture**:
- **Backend-Mediated Design**: All Supabase operations use `SUPABASE_SERVICE_ROLE_KEY` on server only
- **Zero Frontend Exposure**: Frontend has no direct Supabase access for sensitive operations
- **Trial Enforcement**: 
  - **Daily Limit**: Users can create only 1 summary per day (tracked via `last_summary_date` in subscriptions table)
  - **Duration Limit**: Audio recordings must be ≤ 5 minutes (300 seconds)
  - **Period Limit**: Trial expires after 7 days from first use
  - All checks happen BEFORE AI processing to prevent wasted API calls
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

### Frontend Libraries

- **Media Recording API**: Browser native for audio capture and recording state management.
- **Google Fonts CDN**: Multi-language typography (Noto Kufi Arabic + Inter).
- **jsPDF**: PDF generation.
- **html2canvas**: Capturing HTML content for PDF export (with RTL/Arabic support).
- **Clipboard API**: Copy-to-clipboard functionality.
- **date-fns**: Timestamp formatting.