# SkyMeet v3 New — validation

Date: 25 September 2026. Package/API version: 3.1.0.

## Passed

- `npm run check`: 25 Node tests passed; required background assets validated; production build passed.
- `npm run test:browser:regression`: 15 Chromium checks in two fresh-server groups (7 + 8), respecting the unchanged production room-creation rate limit.

Browser coverage includes bidirectional SDP negotiation and camera/screen track separation; notes conflict handling and saving on Leave; malformed saved-room data; multi-image imports; chat notifications and unread counts; guest polls and host permission switches; recording with screen capture unavailable, permission revocation and a nonempty file download; real photo/video background processing; camera-off during background loading; camera/screen permission finishing after Leave; password retry; temporary startup failure recovery; malformed recovery-link encoding; eight themes; mobile landing layout; two-participant whiteboard, notes and chat.

Node coverage includes prior board/notes/persistence regressions, recording permissions, screen-sharing revocation, co-host demotion restrictions, poll ownership after reconnection, reaction events and click/applause sound timing.

## Reproduced before repair

Tests run against the shipped v3.0.0 confirmed:

- Camera permission completing after Leave left a live capture track.
- A background finishing after camera-off replaced the outgoing video with an enabled track.
- Wrong-password failure removed the password/retry form.

Additional fixes from code review have focused regression coverage where listed above. See START-HERE-V3-NEW.md for the full change list.

## Remaining verification limits

The full two-browser remote-media test was attempted and failed waiting for a second video with decoded frames. An independent Chromium ICE diagnostic returned only completion, with no network candidates. Thus remote video/audio delivery has NOT passed in this execution environment. The negotiation test passes, but does not establish working end-to-end media transport.

The full remote-media test remains included. It was excluded only from the separately named targeted regression command, not deleted or weakened. Running all tests rapidly on one server can also hit the production room-creation limit; grouped regression runs use fresh servers and keep that limit intact.

No live Render/Neon account was accessed. Real-device calling, TURN connectivity, mobile recording performance/format compatibility, and remote audio in recordings require deployment acceptance testing. Mobile viewport tests are Chromium tests, not physical iPhone/Android certification. PostgreSQL tests use a test store/pg-mem.

No claim is made that every possible defect is eliminated. The deployed URL and exact failing behavior are still needed to diagnose the user's live failure.
