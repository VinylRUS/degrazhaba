# Task 13-a: Persist Overlay Panel Positions to Database

## Task
Make overlay panel positions persist to the database (Settings table) so they survive page refreshes and work across devices.

## Work Log

### 1. Updated `src/components/streampost/stream-overlay.tsx`

**Load positions from /api/settings on mount:**
- Added `positionsLoadedRef` (useRef) to track whether initial DB load has completed, preventing premature saves of default positions
- Added `useEffect` on mount that:
  - Fetches `/api/settings`
  - Parses `overlayPostContent` and `overlayVoteBar` keys as JSON `{ x, y, width, height }`
  - Validates each parsed object has all 4 numeric properties before using it
  - Falls back to `DEFAULT_PANEL_POSITIONS` on parse errors
  - Sets both local `panelPositions` state and store via `setOverlayPanelPositions`
  - Sets `positionsLoadedRef.current = true` on completion (success or error)

**Save positions to /api/settings with 500ms debounce:**
- Added `saveTimeoutRef` (useRef) for debounce timer
- Added `useEffect` that watches `panelPositions` changes:
  - Skips if `positionsLoadedRef.current` is false (avoids saving defaults on first render)
  - Clears any pending save timeout
  - After 500ms delay, PATCHes to `/api/settings` with:
    - `overlayPostContent`: JSON stringified `panelPositions.postContent`
    - `overlayVoteBar`: JSON stringified `panelPositions.voteBar`
  - Cleans up timeout on unmount

**Removed old sync-from-store useEffect** that was causing a lint error (calling setState in effect body).

### 2. Updated `src/app/overlay/page.tsx`

**Added types and defaults:**
- Added `PanelRect` interface: `{ x, y, width, height }`
- Added `PanelPositions` interface: `{ postContent: PanelRect; voteBar: PanelRect }`
- Added `DEFAULT_PANEL_POSITIONS` constant (same as in stream-overlay.tsx)
- Added `parsePanelRect()` helper function that safely parses JSON with validation and fallback

**Load positions from /api/settings:**
- Extended the existing settings fetch `useEffect` to also parse `overlayPostContent` and `overlayVoteBar`
- Added `panelPositions` state initialized to `DEFAULT_PANEL_POSITIONS`
- On settings fetch success, calls `parsePanelRect()` for each position key and updates state

**Use positions for rendering:**
- Changed VOTING STATE rendering from a single `bottom: 0` container to independent absolute positioning:
  - Content card: positioned at `panelPositions.postContent` (x, y, width, height)
  - Voting bar: positioned at `panelPositions.voteBar` (x, y, width, height)
  - Both elements are now siblings inside a `<>` fragment, each absolutely positioned within the 1920x1080 canvas
- Result state kept with original bottom-anchored layout (result panel uses different positioning logic)

### Settings Keys
- `overlayPostContent` — JSON string of `{ x, y, width, height }` for post content panel
- `overlayVoteBar` — JSON string of `{ x, y, width, height }` for vote bar panel

## Files Modified
- `src/components/streampost/stream-overlay.tsx` — Added load/save useEffect hooks for panel positions
- `src/app/overlay/page.tsx` — Added position loading, types, and absolute positioning for voting state

## Lint Status
- Zero errors, zero warnings
