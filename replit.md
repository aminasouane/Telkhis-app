# Takhleesly - Audio Transcription and Summarization App

## Overview

Takhleesly (تلخيصلي) is an Arabic-focused web application that transcribes audio lectures and generates AI-powered summaries. Users can either record audio directly in the browser or upload audio files, which are then processed through OpenAI's Whisper API for transcription and GPT-4 for intelligent summarization. The application is designed with Arabic language support as its primary focus, featuring RTL (right-to-left) layout and Arabic typography.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter (lightweight client-side routing)
- Single-page application with minimal routing (Home page and 404)
- Simple, declarative route definitions

**UI Component System**: Radix UI with shadcn/ui design patterns
- Material Design 3 inspired color system
- Comprehensive component library (40+ pre-built components)
- Custom theming with CSS variables for light/dark modes
- RTL-first design with Arabic typography (Noto Sans Arabic + Inter fallback)
- Tailwind CSS for styling with custom configuration

**State Management**: 
- TanStack Query (React Query) for server state
- Local React state for UI interactions
- Theme context for light/dark mode persistence

**Key Design Decisions**:
- Progressive disclosure workflow: recording → transcription → summary
- Material Design 3 color palette optimized for productivity and trust
- Mobile-responsive with special considerations for touch interfaces
- Accessibility-first with semantic HTML and ARIA labels

### Backend Architecture

**Runtime**: Node.js with Express.js

**API Structure**: RESTful endpoints
- `/api/health` - Health check endpoint
- `/api/process-audio` - Main audio processing endpoint (POST with multipart/form-data)

**File Upload Handling**: Multer middleware
- In-memory storage (no disk writes)
- 25MB file size limit
- Audio MIME type validation (mp3, wav, m4a, ogg, webm)

**Audio Processing Pipeline**:
1. Receive audio file via multipart upload
2. Transcribe using OpenAI Whisper API (Arabic language specified)
3. Summarize transcription using GPT-4o-mini with Arabic system prompts
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
  - Whisper-1 model for Arabic audio transcription
  - GPT-4o-mini for text summarization and key point extraction
  - Uses official OpenAI Node.js SDK
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
- File drag-and-drop using native browser APIs
- Google Fonts CDN for Arabic typography

**Build & Development**:
- Vite for fast HMR and optimized production builds
- ESBuild for server-side bundling
- TypeScript for type safety across full stack