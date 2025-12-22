# Takhleesly - Audio Transcription and Summarization App

## Overview
Takhleesly (تلخيصلي) is a multi-language web application for transcribing audio lectures and generating AI-powered summaries. It supports Arabic, French, and Algerian dialect, allowing users to record audio directly or upload files. The application leverages **whisper.cpp** (local) for transcription and **Grok API (xAI)** for intelligent summarization. It operates on a freemium model, offering a one-time 30-minute audio trial before requiring a subscription.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, and Vite, using Wouter for routing. UI components are based on Radix UI with shadcn/ui patterns, inspired by Material Design 3, featuring a cyan primary color and RTL-first design with Arabic typography. State management utilizes TanStack Query for server state and React Context for UI, theme, language, and authentication. Key features include a progressive disclosure workflow, multi-language support with dynamic RTL/LTR switching, a live summary, save/share functionalities (TXT, PDF, Web Share API), and distinct pages for home, history, subscription, and terms of use. Session management and user authentication are handled via Supabase Auth, with a usage-based trial system (30 minutes audio).

**Header Component**: Profile icon visibility follows a three-tier logic with strict safeguards:
- **Loading State**: Cached userData is preserved during refresh to prevent flickering (with 300ms debounce)
- **Guest Users** (`user_type === 'guest'`, `undefined`, or `null`): Icon completely hidden
- **Authenticated Users** (verified `user_type` in `['free', 'premium', 'pro_plus']`):
  - Without active subscription: Simple User icon with logout-only dropdown
  - With active subscription: Full menu with badge, name, and user info
- **Implementation**: 
  - Uses case-insensitive whitelist approach with `isAuthenticatedUser()` helper function that normalizes `user_type` to lowercase before validation, ensuring robust guest exclusion even if database returns unexpected values
  - 300ms debounce timer prevents flickering during rapid auth state changes by delaying data fetch
  - `cachedUserIdRef` (useRef) tracks current user ID to distinguish logout/user-switch from token-refresh scenarios
  - Preserves previous userData during token refresh (same user ID) to keep icon visible with no flicker
  - Immediate state clearing on logout (user = null) or user switch (different user.id)
  - Timer callback checks `cachedUserIdRef.current` directly (not closure) to prevent stale fetches after logout/switch
  - Promise resolution guards with `cachedUserIdRef.current === currentCachedId` to prevent updating state with stale data
  - Display condition: `user && userData && isAuthenticatedUser()` (icon shows whenever valid userData exists, independent of loading state)

### Backend
The backend uses Node.js with Express.js, providing RESTful endpoints for health checks, audio processing (live and batch), and secure guest/user management. It employs Multer for in-memory audio file handling. The audio processing pipeline involves pre-processing validation (e.g., duration limits), transcription via whisper.cpp (local), and summarization via Grok API (xAI). The system incorporates a multi-layered security architecture with pre-AI validation, trusted metadata, and defense-in-depth for summary persistence, including freshness and sanity checks, and atomic trial enforcement. Client-side audio duration is used for trial tracking.

**Key Endpoints:**
- `POST /api/process-audio`: Full audio processing (Whisper transcription → Grok summarization)
- `POST /api/process-audio-live`: Live transcription during recording
- `POST /api/summarize`: Standalone text summarization endpoint using Grok API

**Summarization Service** (`server/services/summarizeWithGrok.ts`):
- Uses Grok API via OpenAI SDK compatibility layer
- Language-specific prompts for Arabic, French, and Algerian dialect
- Returns summary, key points, and processing time
- API key: `XAI_API_KEY` (required)

### Data Storage
The project uses PostgreSQL (via Neon serverless) with Drizzle ORM, primarily through Supabase. Tables include `users`, `subscriptions`, `summaries`, `settings`, and `payments`. The `subscriptions` table tracks trial usage, limits, expiration, and payment provider information (Chargily/Stripe). The `payments` table logs all payment transactions with complete metadata for audit trails. All sensitive Supabase operations are mediated by the backend using `SUPABASE_SERVICE_ROLE_KEY`, enforcing RLS policies for data isolation.

## Subscription Plans

### Payment Integration
The application uses **Chargily Pay** for processing subscription payments in Algeria. Three subscription tiers are available:

1. **الخطة الأساسية (Basic Plan)** - 67,400 DZD (~$4.99)
   - 5 محاضرات × 45 دقيقة
   - Total: 225 minutes of audio processing
   - Target: New users trying the service

2. **خطة الطالب (Student Plan)** - 256,500 DZD (~$19.00) ⭐ Most Popular
   - 30 محاضرة × 45 دقيقة
   - Total: 1,350 minutes of audio processing
   - Target: University students, Master's and PhD students

3. **خطة المحترف (Professional Plan)** - 472,400 DZD (~$34.99)
   - 60 محاضرة × 45 دقيقة
   - Total: 2,700 minutes of audio processing
   - Target: Professors, researchers, and heavy users

### Payment Flow
**Using Direct Payment Links (Recommended)**
1. User selects a subscription plan from `/subscribe`
2. Frontend requests payment link via `GET /api/payment-link/:planId`
3. User is redirected directly to Chargily payment page (pre-configured link)
4. User completes payment via EDAHABIA/CIB cards
5. After successful payment, Chargily sends webhook to `/api/chargily/webhook`
6. Backend validates webhook signature and activates **permanent subscription** (no end_date)
7. User is redirected to `/payment/success` with subscription details
8. On failure, user is redirected to `/payment/failed` with retry options

**Legacy API Checkout (Not Recommended)**
- Previous method using `/api/chargily/create-checkout` with JWT authentication
- Requires additional API calls and more complex setup
- Use direct payment links instead for simpler integration

### Security Architecture
**Authentication & Authorization:**
- **JWT-Based Authentication**: All payment endpoints require valid Supabase JWT tokens
- **requireAuth Middleware** (`server/middleware/auth.ts`): Validates Bearer tokens and extracts authenticated user ID
- **No Client-Supplied User IDs**: User identity is derived server-side from verified JWT, preventing privilege escalation attacks
- **Frontend Token Handling**: Authorization header sent with every authenticated request: `Authorization: Bearer <access_token>`

**Payment Security:**
- **Webhook Signature Verification**: All Chargily webhooks validated using signature-based authentication
- **Server-Side User Verification**: User ID extracted from authenticated session only, not from request body
- **Atomic Database Operations**: Subscription activation uses database transactions to prevent inconsistent states

### Environment Variables
**Required for Direct Payment Links (Recommended):**
- `CHARGILY_LINK_BASIC`: Direct payment link for Basic Plan ($4.99)
- `CHARGILY_LINK_STUDENT`: Direct payment link for Student Plan ($19.00)
- `CHARGILY_LINK_PROFESSIONAL`: Direct payment link for Professional Plan ($34.99)
- `CHARGILY_API_KEY`: Secret API key from Chargily Dashboard (for webhook verification)
- `CHARGILY_MODE`: "test" or "live" (defaults to "test")

**Required for authentication middleware:**
- `VITE_SUPABASE_URL`: Supabase project URL (for JWT verification)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key (for JWT verification)

**Setup Guide:** See `PAYMENT_LINKS_SETUP.md` for complete instructions on creating and configuring payment links

### Database Schema
**subscriptions table:**
- `chargily_customer_id`: Chargily customer identifier
- `chargily_checkout_id`: Checkout session identifier
- `chargily_product_id`: Product identifier (if using products)
- `chargily_price_id`: Price identifier (if using prices)
- `payment_provider`: "chargily" | "stripe" | "in-app" | "manual"
- `transaction_id`: Chargily transaction ID for payment tracking (NEW)
- `payment_method`: Payment method used (CIB, EDAHABIA, BaridiMob, etc.) (NEW)
- `payment_status`: Current payment status (pending, paid, failed, refunded) (NEW)

**payments table:**
- Tracks all payment transactions
- Stores Chargily checkout ID and customer ID
- Includes payment status, amount, currency, and metadata
- Links to user and subscription records

**Note:** New payment tracking fields require running the SQL migration: `database/migrations/add_payment_tracking_fields.sql`

## External Dependencies

### Payment Gateway
- **Chargily Pay**: Algeria's leading e-payment gateway for processing subscriptions
    - **Supported Methods**: EDAHABIA (Algérie Poste), CIB (SATIM), International Cards
    - **Currency**: DZD (Algerian Dinar)
    - **Integration**: Via `@chargily/chargily-pay` SDK (V2 API)
    - **Webhook**: Signature verification for payment confirmation
    - **Mode**: Test/Live mode support

### AI/ML Services
- **whisper.cpp (Local)**:
    - **Model**: `small` (466MB) - multilingual, better Arabic support
    - **Languages**: Arabic (ar), French (fr), Algerian dialect (dz → ar)
    - **Integration**: Direct binary execution via child_process.spawn
    - **Bootstrap**: Auto clone → build → download model on first use
    - **Requirements**: FFmpeg, FFprobe, Make, G++ for building
    - **Audio Prep**: Auto-converts to WAV (16kHz, mono, PCM 16-bit)
    - **Limits**: 30 minutes max audio duration
- **Grok API (xAI)**:
    - **Model**: `grok-2-1212` - high context (131K tokens)
    - **Languages**: Arabic, French, Algerian dialect (with language-specific prompts)
    - **Integration**: Via OpenAI SDK compatibility layer (`https://api.x.ai/v1`)
    - **Features**: Text summarization, key point extraction
    - **API Key**: `XAI_API_KEY` (required)
    - **Service File**: `server/services/summarizeWithGrok.ts`

### Database Services
- **Neon Database**: Provides serverless PostgreSQL.
- **Supabase**: Used for PostgreSQL database, authentication, and storage.

### Frontend Libraries
- **Media Recording API**: Native browser API for audio capture.
- **Google Fonts CDN**: For multi-language typography.
- **jsPDF** and **html2canvas**: For PDF generation and HTML content capture.
- **Clipboard API**: For copy-to-clipboard functionality.
- **date-fns**: For date and time formatting.

## Subscription Architecture

### Subscription State Machine
The application uses a unified subscription state system with three states:

1. **trial_active**: User has unused trial capacity
   - Less than 1 summary created AND less than 30 minutes used AND within 7 days
   
2. **trial_expired**: Trial capacity exhausted or expired
   - 1 or more summaries created OR 30+ minutes used OR more than 7 days since first use
   
3. **subscribed**: User has an active paid subscription
   - Future state - activated via `activateSubscription()` after payment confirmation

### Key Files
- **client/src/types/subscription.ts**: TypeScript types (SubscriptionStatus, SubscriptionState, SubscriptionInfo, UsagePermission)
- **client/src/services/subscriptionStateService.ts**: Core state logic (getSubscriptionState, getUsagePermissions, activateSubscription)
- **client/src/components/SubscriptionProvider.tsx**: React Context provider with hooks
- **client/src/services/localTrialService.ts**: localStorage-based trial tracking
- **client/src/config/trialConfig.ts**: Trial configuration constants

### Provider Hooks
- `useSubscription()`: Full subscription context access
- `useSubscriptionState()`: Current state only
- `useSummaryPermission()`: Permission object for summary creation
- `useCanCreateSummary()`: Boolean shorthand for quick checks

### Permission Checking Flow
1. `processAudio()` calls `getUsagePermissions(userId)` synchronously
2. Service reads trial data from localStorage (sync, no loading state issues)
3. Returns `{ allowed: boolean, reason?: string, remaining?: { summaries, minutes } }`
4. If not allowed: show expired modal, block processing
5. If allowed: process audio, then call `recordUsage()` to update counters

### Integration Ready
The skeleton is designed for easy Supabase/payment integration:
- `SubscriptionInfo` type ready for backend subscription data
- `activateSubscription(planId, paymentData)` stub for payment confirmation
- Service layer abstracted - swap localStorage for API calls
- Provider handles state refresh and UI updates