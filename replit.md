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
- **Subscription Management**: A minute-based trial system (30 minutes total, 7 days validity, 30 minutes per day limit) transitions to paid subscriptions handled via Chargily Pay. The system uses a unified state machine (`trial_active`, `trial_used_up`, `trial_expired`, `subscribed`) to manage user access and features.
  - **Trial Quota**: Based on total audio minutes consumed (not request count). Users can create unlimited summaries within the 30-minute quota, but limited to 30 minutes per day.
  - **Daily Limit System**: Users can only process 30 minutes of audio per day. When exceeded, a modal appears showing time until midnight reset. The app remains usable (viewing history, etc.) but processing is blocked until the next day.
  - **Block Reason Types**: All block reasons show modals (no redirects). `daily_limit` → DailyLimitModal, `total_limit`/`days_expired`/`minutes_exhausted` → TrialExpiredModal. The UI always remains accessible.
  - **Duration Calculation**: Server-side authoritative duration using music-metadata/ffprobe (fallback: file-size estimate). Server-calculated duration is used for usage tracking.
  - **Pre-check**: Client checks both `dailyMinutesRemaining >= audioDuration` AND `minutesRemaining >= audioDuration` before processing. Server enforces the 5-minute per-file limit.
  - **Usage Tracking**: Both total and daily usage recorded after successful database save to prevent orphan entries. Daily usage auto-resets at midnight.
  - **MVP Limitation**: One request can exceed the limit before being blocked (single-request overage), but total usage is tracked correctly.

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
- **whisper.cpp**: Local transcription using the `small` multilingual model (466MB) for Arabic, French, and Algerian dialect. Auto-converts audio to WAV.
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