# Takhleesly - Audio Transcription and Summarization App

## Overview

Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages OpenAI's Whisper for transcription and GPT-4 for intelligent summarization. A key feature is a "soft authentication" trial system, offering guests 10 free summaries or 7 days, with seamless data migration upon signup. The project aims to provide an accessible and efficient summarization tool for academic and professional use, with robust multi-language support and user-friendly design.

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
- **Trial System**: Guest users get 10 free summaries or 7 days; data migrates upon signup. Trial checks and increments are handled securely server-side.
- **Print Feature**: Print-friendly styling with automatic print trigger via URL parameter `?print=true`.

### Backend Architecture

**Runtime & API**: Node.js with Express.js, offering RESTful endpoints.
- `/api/health`: Health check.
- `/api/process-audio-live`: Real-time transcription/summarization during recording.
- `/api/process-audio`: Main audio processing (transcription, summarization).
- Backend-mediated authentication and trial enforcement, with all Supabase operations handled server-side using a service role key.

**File Handling**: Multer middleware for in-memory audio file processing (max 25MB, specific MIME types).

**Audio Processing Pipeline**:
1. Audio file and language received.
2. Transcription via OpenAI Whisper API (language-specific settings).
3. Summarization via GPT-4o-mini with language-specific prompts (Classical Arabic, Academic French; Algerian dialect converted to simplified Classical Arabic).
4. Returns structured JSON response.

**Security**: Backend-only Supabase access, server-side trial enforcement before AI processing, atomic summary saving/trial increment, and RLS policies for user data isolation.

### Data Storage Solutions

**Database**: PostgreSQL (via Neon serverless) with Drizzle ORM.
- **Supabase**: Primary database for users, subscriptions, summaries, and settings.
  - Tables: `users`, `subscriptions`, `summaries`, `settings`.
  - Relations: User IDs are foreign keys in `subscriptions`, `summaries`, and `settings`, with CASCADE DELETE.
  - Indexed columns for query optimization.
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