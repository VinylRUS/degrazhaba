# Task 4: Rewrite StreamOverlay as WYSIWYG Editor

## Work Log

### Store Updates (`src/lib/streampost-store.ts`)
- Added `PanelRect` interface: `{ x: number; y: number; width: number; height: number }`
- Added `OverlayPanelPositions` interface: `{ postContent: PanelRect; voteBar: PanelRect }`
- Added `overlayPanelPositions` state with defaults:
  - postContent: `{ x: 20, y: 680, width: 500, height: 400 }`
  - voteBar: `{ x: 20, y: 900, width: 1880, height: 160 }`
- Added `setOverlayPanelPositions` action

### Component Rewrite (`src/components/streampost/stream-overlay.tsx`)
Complete rewrite from static preview to WYSIWYG editor with:

1. **1920×1080 Scaled Canvas** — Uses `transform: scale()` with `ResizeObserver` to fit browser width. Shows fake stream background with grid pattern.

2. **Draggable Panels** — Two panels (`PostContent` and `VoteBar`) rendered inside the canvas:
   - Drag handle bar at top of each panel with `GripVertical` icon and label
   - Resize handle at bottom-right corner (dot pattern)
   - Blue outline when panel is being dragged/resized
   - Mouse events: `onMouseDown`, `onMouseMove` (window), `onMouseUp` (window)
   - Coordinates scaled by `canvasScale` factor
   - Position clamping: panels stay within 1920×1080 bounds

3. **Grid Guides** — When dragging any panel, shows center crosshair and rule-of-thirds guides in blue at low opacity

4. **Two-Column Layout** — Left: canvas preview, Right: customization sidebar (collapses to stacked on mobile)

5. **Customization Sidebar** includes:
   - Color theme selector (5 themes with visual swatches)
   - Bar thickness selector
   - Animation speed selector
   - Show timer toggle
   - Show percentages toggle
   - Panel position inputs (x, y, width, height) for both panels
   - Reset positions button

6. **Overlay URL Section** — Displays overlay URL with copy button, recommended OBS settings (1920×1080, transparent CSS)

7. **Simulation Controls** — Start/Stop/Reset buttons integrated into the layout

8. **Demo Post** — When no overlay post and not simulating, shows a demo TEXT post so the WYSIWYG editor always has content visible

9. **All Existing Features Preserved**:
   - Color themes (emerald, red, purple, amber, teal)
   - Bar thickness options
   - Animation speed options
   - Timer and percentage toggles
   - Twitch emote integration
   - PostContentPreview component (refactored for canvas use)
   - Vote simulation with auto-generated votes
   - Result state (ЧАТ РЕШИЛ! / МЕЧТА ЧАТА УБИТА)

## Stage Summary
- **WYSIWYG canvas** with scaled 1920×1080 preview
- **Draggable + resizable panels** with position persistence to Zustand store
- **Grid guides** shown during drag operations
- **Customization sidebar** with all settings and position inputs
- **Overlay URL** with copy button and OBS instructions
- **Simulation mode** preserved and working
- **Zero lint errors**
