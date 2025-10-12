# تلخيصلي (Takhleesly) - Design Guidelines

## Design Approach

**Selected Approach**: Design System - Material Design 3
**Justification**: Takhleesly is a utility-focused productivity tool for transcribing and summarizing audio lectures. Material Design 3 provides excellent components for audio controls, file uploads, and text-heavy displays while maintaining clarity and accessibility for Arabic RTL layouts.

**Key Design Principles**:
- Clarity over decoration - users need to focus on transcriptions and summaries
- Progressive disclosure - show recording controls, then transcription, then summary in clear stages
- Trustworthy simplicity - minimal distractions during the core workflow

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Primary: 220 70% 50% (Professional blue for trust and focus)
- Primary Container: 220 90% 95% (Light blue for backgrounds)
- On Primary: 0 0% 100%
- Surface: 0 0% 98%
- On Surface: 220 20% 20%
- Outline: 220 15% 70%

**Dark Mode**:
- Primary: 220 80% 65%
- Primary Container: 220 60% 25%
- On Primary: 220 100% 10%
- Surface: 220 15% 12%
- On Surface: 220 10% 95%
- Outline: 220 15% 35%

**Semantic Colors**:
- Success (recording active): 145 65% 45%
- Warning (processing): 35 90% 55%
- Error: 0 70% 50%

### B. Typography

**Font Family**: 
- Arabic: 'Noto Sans Arabic' via Google Fonts
- Latin fallback: 'Inter' via Google Fonts

**Type Scale**:
- Display: 2.5rem (40px) / font-semibold - Hero headings
- Headline: 2rem (32px) / font-semibold - Section titles
- Title: 1.5rem (24px) / font-medium - Card headers
- Body Large: 1.125rem (18px) / font-normal - Transcription text
- Body: 1rem (16px) / font-normal - Standard content
- Label: 0.875rem (14px) / font-medium - Buttons, metadata
- Caption: 0.75rem (12px) / font-normal - Timestamps, hints

**RTL Considerations**: All text alignment and spacing must support right-to-left reading direction with `dir="rtl"` on the root element.

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, and 16 for consistent rhythm
- Component padding: p-6 (medium), p-8 (large cards)
- Section spacing: py-12 (mobile), py-16 (desktop)
- Element gaps: gap-4 (compact), gap-6 (standard), gap-8 (spacious)

**Grid System**:
- Max content width: max-w-5xl (1024px) for optimal reading
- Transcription/summary display: max-w-4xl for comfortable text length
- Container padding: px-4 (mobile), px-6 (tablet), px-8 (desktop)

### D. Component Library

**1. Navigation**:
- Simple top bar with logo on the right (RTL), minimal menu
- Sticky positioning for easy access during scrolling through long transcriptions
- Surface elevation with subtle shadow

**2. Audio Recording Interface**:
- Large circular record button (80px mobile, 96px desktop)
- Waveform visualization during recording (subtle animation)
- Timer display showing recording duration
- Status indicator (idle/recording/processing) with color-coded badges

**3. File Upload Component**:
- Drag-and-drop zone with dashed border
- File icon and supporting text in Arabic
- Accepted formats clearly listed (.mp3, .wav, .m4a)
- Progress indicator for upload state

**4. Transcription Display**:
- Card-based layout with generous padding (p-8)
- Timestamp markers in the margin
- Speaker labels if multi-speaker detection is added later
- Copy-to-clipboard button in header

**5. Summary Card**:
- Distinct visual treatment from transcription (tinted background)
- Bullet points or numbered lists for key points
- Expandable sections for detailed summaries
- Action buttons: copy, download, share

**6. Loading States**:
- Skeleton screens for transcription/summary loading
- Circular progress for audio processing
- Micro-animations for state transitions (duration: 200-300ms)

**7. Empty States**:
- Illustrative icon or simple graphic
- Clear call-to-action text
- Primary button to start first recording

### E. Interaction Patterns

**Audio Recording Flow**:
1. Landing state: Upload or Record options presented equally
2. Recording state: Large stop button, real-time waveform, timer
3. Processing state: Progress indicator with estimated time
4. Results state: Transcription and summary displayed in tabs or sequential sections

**Responsive Behavior**:
- Mobile: Single column, full-width cards, bottom-sheet for actions
- Tablet: Maintain single column with wider cards (max-w-3xl)
- Desktop: Optional two-column for transcription + summary side-by-side (if transcript is short)

**Animations**: Use sparingly
- Button press: Scale transform (95%)
- Card appearance: Fade-in with slight upward motion (20px)
- State transitions: Cross-fade between loading/content
- NO decorative background animations or parallax effects

---

## Images

**Hero Section** (if landing page is created):
- Use an image showing someone studying or in a lecture setting
- Overlay with semi-transparent gradient (from transparent to surface color)
- Position hero text on the right side (RTL) with blurred-background outline buttons

**Empty States**:
- Simple iconographic illustrations (not photos) for "no recordings yet" state
- Microphone icon with sound waves for upload prompt
- Keep illustrations minimal and in brand colors

**UI Icons**: Use Material Icons via CDN for consistency with Material Design system
- Microphone, stop, play, pause, upload, download, copy, share icons
- Ensure all icons render correctly in RTL layout

---

## Accessibility & RTL Guidelines

- Full RTL support: Flip all horizontal layouts, margins, padding, and navigation
- Maintain WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI components)
- Form inputs and text areas styled consistently in dark mode with proper contrast
- Keyboard navigation support for all interactive elements
- ARIA labels in Arabic for screen reader support
- Focus indicators visible in both light and dark modes

---

## Platform-Specific Considerations

**Replit Environment**:
- Design should work seamlessly at all viewport sizes (Replit's preview pane can be resized)
- Ensure components are self-contained for easy integration
- Use CDN resources for fonts and icons (no local asset dependencies)