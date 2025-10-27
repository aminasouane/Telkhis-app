# Takhleesly - Audio Transcription and Summarization App

## Overview
Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages OpenAI's Whisper for transcription and GPT-4 for intelligent summarization. It operates on a freemium model, offering a one-time 30-minute audio trial before requiring a subscription.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, and Vite, using Wouter for routing. UI components are based on Radix UI with shadcn/ui patterns, inspired by Material Design 3, featuring a cyan primary color and RTL-first design with Arabic typography. State management utilizes TanStack Query for server state and React Context for UI, theme, language, and authentication. Key features include a progressive disclosure workflow, multi-language support with dynamic RTL/LTR switching, a live summary, save/share functionalities (TXT, PDF, Web Share API), and distinct pages for home, history, subscription, and terms of use. Session management and user authentication are handled via Supabase Auth, with a usage-based trial system (30 minutes audio).

### Backend
The backend uses Node.js with Express.js, providing RESTful endpoints for health checks, audio processing (live and batch), and secure guest/user management. It employs Multer for in-memory audio file handling. The audio processing pipeline involves pre-processing validation (e.g., duration limits), transcription via OpenAI Whisper, and summarization via GPT-4o-mini. The system incorporates a multi-layered security architecture with pre-AI validation, trusted metadata, and defense-in-depth for summary persistence, including freshness and sanity checks, and atomic trial enforcement. Client-side audio duration is used for trial tracking.

### Data Storage
The project uses PostgreSQL (via Neon serverless) with Drizzle ORM, primarily through Supabase. Tables include `users`, `subscriptions`, `summaries`, and `settings`. The `subscriptions` table tracks trial usage, limits, and expiration, and is prepared with fields for Stripe integration. All sensitive Supabase operations are mediated by the backend using `SUPABASE_SERVICE_ROLE_KEY`, enforcing RLS policies for data isolation.

## External Dependencies

### AI/ML Services
- **OpenAI API**:
    - **Whisper-1**: Multi-language audio transcription.
    - **GPT-4o-mini**: Language-specific text summarization and key point extraction.

### Database Services
- **Neon Database**: Provides serverless PostgreSQL.
- **Supabase**: Used for PostgreSQL database, authentication, and storage.

### Frontend Libraries
- **Media Recording API**: Native browser API for audio capture.
- **Google Fonts CDN**: For multi-language typography.
- **jsPDF** and **html2canvas**: For PDF generation and HTML content capture.
- **Clipboard API**: For copy-to-clipboard functionality.
- **date-fns**: For date and time formatting.