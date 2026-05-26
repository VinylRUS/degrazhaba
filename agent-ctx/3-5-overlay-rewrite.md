# Task 3-5: Rewrite Overlay Page for OBS Browser Source

## Task Description
Rewrite the overlay page at `/overlay` to be a full 1920x1080 OBS browser source with media display, customizable labels, and transparent background.

## Work Completed

### 1. Rewrote `src/app/overlay/page.tsx`
Complete rewrite with the following features:

- **1920x1080 canvas** — Fixed dimensions designed for OBS browser source
- **Transparent background** — Works in OBS with transparent background
- **Media display during voting**:
  - **PHOTO posts**: Full image with blur background effect (blurred enlarged version behind, sharp image in front), max height 400px, loading spinner, error handling
  - **YOUTUBE posts**: YouTube thumbnail with red play button overlay (pulsing animation), dark gradient at bottom, YouTube title overlay, fallback card for posts without thumbnail
  - **TEXT posts**: Styled quote card with decorative quotation mark, 18px text, max height 200px overflow hidden
- **Customizable text labels from settings API**:
  - `overlayVotingLabel` (default: "Голосование чата") — shown during voting
  - `overlayWinText` (default: "ЧАТ РЕШИЛ!") — when chat approved
  - `overlayLoseText` (default: "МЕЧТА ЧАТА УБИТА") — when chat rejected
  - `overlayApprovedText` (default: "ПРИНЯТО!") — short approved text
  - `overlayRejectedText` (default: "ОТКЛОНЕНО") — short rejected text
- **Full post data fetching** — When vote:start fires, fetches `/api/posts/{postId}` to get `mediaUrl`, `youtubeThumbnail`, `youtubeTitle`, `type`, `text`, `author`
- **Post content card above voting bar** — Content shown in a glassmorphism card with rounded corners, border glow
- **Author display** — Username below content with avatar initial and post type badge (ФОТО/YOUTUBE/ТЕКСТ)
- **Socket.io functionality preserved**: vote:start, vote:update, vote:end events
- **Inline styles only** — No Tailwind CSS dependency, works standalone in OBS
- **Result state** — After vote:end: content card dims/fades, result panel shows with bounce animation, approved (🎉 green) or rejected (💀 red)
- **Connection indicator** — Subtle top-right dot showing LIVE/OFFLINE status
- **Timer countdown** — Monospace font, turns red and pulses when ≤5 seconds

### 2. Updated `src/app/overlay/layout.tsx`
- Added `<style>` tag to override body/html background to transparent
- Overrides `!important` on background, margin, padding, overflow
- Ensures the overlay works properly in OBS with transparency

### Key Design Decisions
- Used inline styles only (no Tailwind) since it's a standalone OBS page that may not load Tailwind properly
- Connected to Socket.io at `/?XTransformPort=3003` per gateway requirements
- Content card max-width 680px, centered above voting bar
- Photo images have blur background effect with the same image scaled up and blurred
- YouTube play button has a pulsing animation to draw attention
- Text posts get a decorative quotation mark and slightly larger font
- All animations use CSS keyframes defined in a `<style>` tag
- Result state auto-dismisses after 6 seconds, returning to idle

## Files Modified
- `src/app/overlay/page.tsx` — Complete rewrite
- `src/app/overlay/layout.tsx` — Added transparent background overrides

## Lint Status
- Zero lint errors
