# Takhleesly - Audio Transcription and Summarization App

## Overview
Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages OpenAI's Whisper for transcription and GPT-4 for intelligent summarization. It operates on a freemium model, offering a 7-day free trial with daily limits before requiring a subscription.

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