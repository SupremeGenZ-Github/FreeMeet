# SkyMeet v3 validation

Date: 24 September 2026. Package/API version: 3.0.0.

## Passed

- Production build (`npm run build`).
- 21 Node tests: server authorization, participant recording revocation, participant poll permissions/ownership, chat sender identity, hand-raise transitions, PostgreSQL snapshot round-trip (pg-mem), permanent-room lifecycle, notes conflicts/formatting/saving, whiteboard undo and large image messages.
- Nine distinct Chromium browser tests passed across the regression run and targeted reruns after fixes:
  1. Four bidirectional negotiated media sections with separate camera and screen tracks.
  2. Notes conflicts preserve drafts; Leave flushes edits.
  3. Malformed saved-room data recovery.
  4. Multi-image import stays connected.
  5. Mobile landing layout.
  6. Eight palettes and saved mode preferences.
  7. Guest images, whiteboard undo/redo, notes and chat in both directions.
  8. Chat pop-ups/unread counts; guest poll creation and host disable; recording without getDisplayMedia at a mobile viewport; host revocation stops it and an actual nonempty recording downloads; sound preference persistence; unsupported screen-capture guidance.
  9. Real MediaPipe runtime/model loads under the production CSP; uploaded PNG and WebM backgrounds apply and remove; removing the effect while the camera is off preserves that off state.

During development, a transient chat popup remained visible as chat opened. Rendering now suppresses popups whenever the chat panel is open; the regression passes. Tests for host switches wait for server synchronization rather than assuming an immediate local checkbox update. Recording tests allow media frames to accumulate and verify the actual download rather than fetching a blob under the restrictive connect-src policy.

## Limitations

- Mobile viewport testing uses Chromium with screen capture deliberately unavailable. It is not a physical Android/iPhone hardware test. Real phone codecs, performance, background suspension and saving must be checked using UPGRADE-SKYMEET-V3.md.
- The existing full remote-media test is retained but was not rerun in this release. The v2 execution environment could not obtain usable ICE candidates. Negotiation passes; end-to-end internet camera/audio, TURN, remote recording audio and background appearance on another device still require deployed two-device testing.
- Sound preference behavior was tested; audible quality was not evaluated by a human listener.
- No Render/Neon account was accessed or deployed. Database tests use an emulator/test store, not your live Neon database.
- The host recording permission controls only the built-in recorder, not external software or phone OS recording.

Run locally: `npm ci --include=dev`, `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:browser`. The full browser command also runs the retained end-to-end media test and requires working WebRTC networking. Use `npx playwright test --grep-invert 'two real browser contexts'` for the nine targeted regression cases.
