# ぴた壁 — PITAKABE

Client-side screenshot wallpaper maker for recent iPhones. Images remain in browser memory; no image upload, storage, or analytics endpoints are used. Supports PNG, JPEG and WebP up to 30 MB and 40 million decoded pixels. Produces an opaque PNG at the selected device's native pixel resolution.

## Run

- `npm ci`
- `npm run dev`
- `npx tsc --noEmit`
- `node --test tests/wallpaper.test.mjs tests/export.test.mjs tests/accessibility-ssr.test.mjs`
- `QA_CANVAS_MODULE=/absolute/path/to/@napi-rs/canvas node --test tests/png-output.test.mjs` (requires a separately installed compatible native canvas; the app has no dependency on it)
- `npm run build`

## Behavior

- Select a screenshot, or try the built-in text sample.
- Choose among 26 models (12 through 17, e, mini, Plus, Pro, Pro Max, and Air).
- Adjust margins, background, contained image size, vertical alignment, and top/bottom screenshot cropping.
- Switch lock/home illustrative overlays; guide visibility does not affect export.
- Create a PNG, then download or invoke native file sharing where available. On iPhone, a long press on the generated image provides a fallback. Sharing cancellation does not claim a successful save.
- The selected image is never persisted. Reloading resets the editor.

Sources and safe-area limitations are in DEVICE_SOURCES.md. Device resolutions are exact; simulated clocks, controls and app icons are approximate and depend on the user's iOS settings. The app cannot set iOS wallpaper directly.

## Validation scope

TypeScript, the production build, placement invariants across device sizes and extreme aspect ratios, cropping boundaries, real PNG encode/decode for 104 outputs, obsolete export handling, custom dark guide contrast, and the six server-rendered slider labels are checked. See QA_REPORT.md for evidence and limits. Browser interaction tests were attempted but blocked by the browser tool policy check; physical iPhone saving remains unverified.

Two optional imperative WebMCP tools (`read_wallpaper_settings`, `configure_wallpaper`) feature-detect `document.modelContext`, reuse editor state and validate input. No supported WebMCP validation context was available; registration and in-browser state transitions remain unverified. Unsupported browsers use the same editor without these tools.
