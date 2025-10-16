# Takhleesly - Audio Transcription and Summarization App

## Overview

Takhleesly (تلخيصلي) is a multi-language web application that transcribes audio lectures and generates AI-powered summaries. Users can select their preferred language (Arabic, French, or Algerian dialect) and either record audio directly in the browser or upload audio files. The audio is then processed through OpenAI's Whisper API for transcription and GPT-4 for intelligent summarization in the selected language. The application features RTL/LTR layout switching and language-specific typography.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter (lightweight client-side routing)
- Multi-page application with three routes:
  - `/` - Home page (recording/upload and results display)
  - `/history` - History page (session management)
  - 404 - NotFound page
- Simple, declarative route definitions
- URL query parameters for session loading: `/?session={id}`

**UI Component System**: Radix UI with shadcn/ui design patterns
- Material Design 3 inspired color system with cyan primary color (hue 180°)
- Comprehensive component library (40+ pre-built components)
- Custom theming with CSS variables for light/dark modes
- RTL-first design with Arabic typography (Noto Kufi Arabic + Inter fallback)
- Tailwind CSS for styling with custom configuration

**State Management**: 
- TanStack Query (React Query) for server state
- Local React state for UI interactions
- Theme context for light/dark mode persistence
- Language context for multi-language support and RTL/LTR switching
- localStorage for session history persistence (takhleesly_sessions key)

**Key Design Decisions**:
- Progressive disclosure workflow: language selection → recording/upload → transcription → summary
- Multi-language support with Arabic (Classical), French (Academic), and Algerian dialect
- Algerian dialect is automatically converted to Classical Arabic for better clarity (with user notification)
- Dynamic RTL/LTR layout switching based on selected language
- **Live Summary Feature**: Real-time transcription and summarization during recording
  - Automatic updates every 15 seconds during recording
  - Displays partial transcription and key points as recording progresses
  - Seamless transition to final summary when recording stops
  - Non-intrusive error handling to prevent recording interruption
- **Save & Share Feature**: Export and share summaries with multiple formats
  - Copy to clipboard: One-click copy of summary + key points
  - Export as TXT: Plain text download with formatted content
  - Export as PDF: Professional PDF with RTL support for Arabic
  - Smart file naming: Includes session title and timestamp (yyyy-MM-dd_HH-mm)
  - Toast notifications for all actions (copy, save, errors)
  - Dialog-based export: User-friendly modal to choose format
- **Screen Separation Architecture**: Dedicated pages for focused user experience
  - Home page: Clean recording/upload interface without tabs
  - History page: Separate dedicated page for session management
  - Navigation: Clear buttons for switching between recording and history
- Session history management with localStorage for offline persistence
- Material Design 3 color palette with cyan primary color (180° hue) optimized for productivity and trust
- Mobile-responsive with special considerations for touch interfaces
- Accessibility-first with semantic HTML and ARIA labels
- **Print Feature**: Print-friendly styling with automatic print trigger via URL parameter
  - Print button in SummaryCard and HistoryList components
  - URL parameter `?print=true` triggers automatic print dialog
  - Clean white-background print layout with RTL support
  - Hides interactive elements during printing

**Session Management**:
- Auto-save transcription sessions after successful processing
- Sessions stored locally in localStorage (key: "takhleesly_sessions")
- Each session includes: id, title (first 5 words), date, language, summary, transcript, keyPoints
- **History Page** (`/history`):
  - Dedicated page for session management
  - Two main action buttons:
    - "تسجيل محاضرة جديدة" (New Recording): Navigate to home
    - "سجل التلخيصات" (History): Disabled when on history page
  - Card-based UI showing all saved sessions
  - Session actions: Open (navigate to `/?session={id}`), Delete (with confirmation dialog)
  - Empty state handling when no sessions exist
  - Date formatting with locale support (Arabic/French)
- **Session Loading**:
  - URL parameter support: `/?session={id}` opens specific session
  - Error handling for invalid/missing session IDs with toast notification
  - Session normalized on load with keyPoints fallback to empty array
- **Navigation Flow**:
  - Home → History: Click "عرض سجل التلخيصات" button
  - History → Home: Click "تسجيل محاضرة جديدة" button
  - History → Home (with session): Click "فتح" on session card

### Backend Architecture

**Runtime**: Node.js with Express.js

**API Structure**: RESTful endpoints
- `/api/health` - Health check endpoint
- `/api/process-audio-live` - Live summary endpoint for real-time updates during recording
  - Accepts: audio chunk + language parameter (ar/fr/dz)
  - Returns: partial transcription, summary, and key points
  - Non-blocking error handling (returns empty response on error)
- `/api/process-audio` - Main audio processing endpoint (POST with multipart/form-data)
  - Accepts: audio file + language parameter (ar/fr/dz)
  - Returns: final transcription, summary, and key points

**File Upload Handling**: Multer middleware
- In-memory storage (no disk writes)
- 25MB file size limit
- Audio MIME type validation (mp3, wav, m4a, ogg, webm)

**Audio Processing Pipeline**:
1. Receive audio file and language selection via multipart upload
2. Transcribe using OpenAI Whisper API with language-specific settings:
   - Arabic (ar): Whisper with Arabic language
   - French (fr): Whisper with French language
   - Algerian dialect (dz): Whisper with Arabic language (dialect handled in summarization)
3. Summarize transcription using GPT-4o-mini with language-specific prompts:
   - Arabic: Classical Arabic (فصحى) summaries
   - French: Academic French summaries
   - Algerian dialect: Automatically converted to simplified Classical Arabic (with UI notification)
4. Return structured JSON response with transcription, summary, and key points

**Error Handling**: Centralized Express error middleware with status code propagation

### Data Storage Solutions

**Database**: PostgreSQL (via Neon serverless)
- Drizzle ORM for type-safe database queries
- Schema-first approach with Zod validation
- Currently implements basic user table (username/password)
- Migration system via drizzle-kit

**Session Storage**: In-memory storage with potential for PostgreSQL sessions
- Basic user CRUD operations defined
- Ready for authentication implementation

**Temporary Storage**: In-memory file buffers
- Audio files processed in memory without disk persistence
- Reduces I/O overhead for transient processing

### External Dependencies

**AI/ML Services**:
- **OpenAI API** (Primary integration)
  - Whisper-1 model for multi-language audio transcription (Arabic, French)
  - GPT-4o-mini for language-specific text summarization and key point extraction
  - Language-specific prompts:
    - Arabic: Classical Arabic summaries
    - French: Academic French summaries  
    - Algerian dialect: Converts to simplified Classical Arabic (more suitable for academic context)
  - Uses official OpenAI Node.js SDK with toFile helper for buffer handling
  - Requires OPENAI_API_KEY environment variable

**Database Services**:
- **Neon Database** (Serverless PostgreSQL)
  - Connection via @neondatabase/serverless
  - Requires DATABASE_URL environment variable

**Development Tools**:
- **Replit-specific plugins** (development mode only)
  - Runtime error overlay
  - Cartographer for code navigation
  - Development banner

**Frontend Libraries**:
- Media Recording API (browser native) for audio capture
  - Manual stop recording feature with dedicated stop button
  - Three recording states: idle, recording, stopping
  - Protection against race conditions and multiple clicks
  - Proper lifecycle management: idle→recording→stopping→idle
  - State transitions follow MediaRecorder events (not timers)
- File drag-and-drop using native browser APIs
- Google Fonts CDN for multi-language typography (Noto Kufi Arabic + Inter)
- Language persistence via localStorage
- **Export Libraries**:
  - jsPDF for PDF generation
  - html2canvas for capturing HTML content with RTL/Arabic support
  - Clipboard API for copy-to-clipboard functionality
  - date-fns for timestamp formatting in filenames

**Build & Development**:
- Vite for fast HMR and optimized production builds
- ESBuild for server-side bundling
- TypeScript for type safety across full stack