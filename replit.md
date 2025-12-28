# Takhleesly - Audio Transcription and Summarization App

## Overview
Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages `whisper.cpp` for local transcription and Grok API (xAI) for intelligent summarization. It operates on a freemium model, offering a one-time 30-minute audio trial before requiring a subscription. The business vision is to provide an accessible and powerful tool for students, researchers, and professionals to streamline their lecture and audio content analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built with React, TypeScript, and Vite, utilizing Radix UI with shadcn/ui patterns, inspired by Material Design 3. It features a cyan primary color and an RTL-first design with Arabic typography. The workflow emphasizes progressive disclosure, multi-language support with dynamic RTL/LTR switching, and features like live summary, save/share functionalities (TXT, PDF, Web Share API).

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter for routing. State management uses TanStack Query for server state and React Context for UI, theme, language, and authentication.
- **Backend**: Node.js with Express.js, providing RESTful endpoints for audio processing (live and batch) and secure user management. Multer handles in-memory audio files.
- **Audio Processing Pipeline**: Involves pre-processing validation, transcription via `whisper.cpp`, and summarization via Grok API.
- **Security**: Multi-layered security with pre-AI validation, trusted metadata, defense-in-depth for summary persistence, and atomic trial enforcement. JWT-based authentication secures all payment and user-sensitive endpoints.
- **Subscription Management**: Transitions to paid subscriptions handled via Chargily Pay. The system uses a unified state machine (`trial_active`, `trial_expired`, `subscribed`) to manage user access and features.
  - **MVP Trial Logic** (CURRENT - v3.2):
    - **Daily Limit**: 30 minutes per day. Resets at midnight.
    - **Date Expiry**: 7 days from first use. After 7 days, trial is blocked.
    - **Total Limit**: 210 minutes total (30 × 7). Now used for blocking.
    - **Unified Config**: `shared/trial.ts` is single source of truth for all limits.
  - **Trial States**: `ACTIVE` (can use), `EXPIRED` (7 days passed), `USED_UP` (total limit reached).
  - **Block Reasons**: `daily_limit` → DailyLimitModal, `days_expired` or `total_limit` → TrialExpiredModal.
  - **Server Error Codes**: `TRIAL_DAILY_LIMIT_REACHED`, `TRIAL_DAYS_EXPIRED`, `TRIAL_TOTAL_LIMIT_REACHED`.
  - **Critical Flow Rule**: Any recording that HAS STARTED must ALWAYS complete. Blocking only affects NEXT attempt.
  - **Pre-check Flow**: Client calls `handleBeforeRecording()` (returns boolean) BEFORE microphone activation. If false, shows modal.
  - **Duration Calculation**: Server-side authoritative duration using music-metadata (fallback: file-size estimate).
  - **Usage Capping**: `recordUsage()` caps at limits (210 total, 30 daily) to prevent exceeding limits.
  - **Debug Commands**: `resetTrial()` and `debugTrial()` in browser console (auto-detects userId).

### Feature Specifications
- **Header Component**: Implements a robust profile icon visibility logic based on user authentication status (`guest`, `free`, `premium`, `pro_plus`) with debouncing and caching to prevent flickering during state changes.
- **Summarization Service**: Uses language-specific prompts for Arabic, French, and Algerian dialects, returning summaries, key points, and processing time.
- **Payment Flow**: Users select a plan, the frontend requests a direct payment link from the backend, redirecting the user to Chargily. Post-payment, Chargily webhooks update the subscription status, activating a permanent subscription.

### System Design Choices
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM, managed primarily through Supabase. Tables include `users`, `subscriptions`, `summaries`, `settings`, and `payments`.
- **Authentication**: Supabase Auth for user authentication and session management.
- **Payment Integration**: Chargily Pay is integrated for processing subscription payments in Algeria, supporting various local payment methods.

## External Dependencies

### Payment Gateway
- **Chargily Pay**: Algeria's e-payment gateway, integrated for subscriptions via direct payment links and webhook verification.

### AI/ML Services
- **whisper.cpp**: Local transcription using the `small` multilingual model (466MB) for Arabic, French, and Algerian dialect. Auto-converts audio to WAV. Memory-optimized: uses 2 threads, greedy decoding (beam_size=1, best_of=1) to prevent OOM in Replit's 2GB container.
- **Grok API (xAI)**: Utilizes the `grok-3` model via an OpenAI SDK compatibility layer for text summarization and key point extraction, supporting multiple languages with specific prompts.

### Database Services
- **Neon Database**: Serverless PostgreSQL.
- **Supabase**: Provides PostgreSQL database, authentication, and storage.

### Frontend Libraries/APIs
- **Media Recording API**: For native audio capture.
- **Google Fonts CDN**: For multi-language typography.
- **jsPDF** and **html2canvas**: For PDF generation.
- **Clipboard API**: For copy-to-clipboard functionality.
- **date-fns**: For date and time formatting.