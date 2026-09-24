# SkyMeet v2 test results

Date: 24 September 2026. Package/API version: 2.1.0.

## Passed

- `npm run check`: **18/18 Node tests passed**, then the Vite production build passed.
- `npx playwright test --grep-invert 'two real browser contexts'`: **7/7 browser tests passed**.

The Node tests include persistence round-trip, access controls, notes revision persistence and conflicts, whitespace preservation, deferred-save flushing, keeping drafts after failure, repeated undo/redo, protecting another participant's edits, and multi-image payloads larger than the former transport limit.

Browser regression coverage:

1. Actual Chromium SDP negotiation: exactly four bidirectional negotiated transceivers on each peer; camera and screen streams have one audio and one video track each; camera replacement and screen-track stopping affect the correct senders.
2. Two participants editing notes concurrently preserve the losing writer's draft. Explicit draft replacement synchronizes, and immediate Leave saves the final edit with whitespace intact.
3. Malformed stored room-list data does not crash the homepage.
4. A JSON import containing three real, decoded JPEG images above 512 KiB succeeds; the participant stays connected and can send chat afterward.
5. Mobile landing layout fits the viewport.
6. All eight palettes and independent saved mode preferences work.
7. Two-participant whiteboard/image upload, undo/redo, templates, notes, chat, export and mobile canvas flows pass.

## Not passed in this execution environment

The existing full media test (`two real browser contexts: media, waiting room, chat, collaboration and end`) timed out waiting for remote video frames. Local camera preview worked. An independent Chromium ICE-gathering diagnostic with no external ICE servers produced no usable candidates, even with loopback enabled. The environment could therefore validate real negotiation but not establish the media transport.

The full test remains included and is not silently skipped or weakened. Running `npm run test:browser` in an environment without a usable media path can still fail this test. Test it after deployment on real devices/networks; configure TURN when direct peer connectivity is unavailable. No claim of verified internet audio/video is made.

## Scope

This release addresses the eight reproduced findings in UPGRADE-SKYMEET-V2.md. It does not guarantee absence of all other defects. Live Render/Neon credentials and the user's deployed URL were not available, so the live deployment was not modified or verified. PostgreSQL persistence tests use the supplied test store and pg-mem emulator rather than the user's Neon account.
