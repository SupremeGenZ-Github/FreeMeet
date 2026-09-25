# SkyMeet v3 — New (3.1.0)

This is the corrected v3 package, replacing v3.0.0. It retains themes, uploaded backgrounds, sound controls, chat notifications, participant polls, recording, whiteboard, notes and permanent rooms.

## Update your existing deployment

1. Save a copy of your current GitHub source.
2. Extract this ZIP. Upload its CONTENTS into the same GitHub directory that holds package.json. Include src, server, shared, public, scripts, package.json and package-lock.json. Do not upload only an HTML file or the ZIP itself.
3. Include the complete public/background directory. The build now validates required background assets and reports exactly which file is missing.
4. Keep your existing Render service and Neon DATABASE_URL. No database deletion, new Neon project or manual migration is needed. Keep existing host recovery links.
5. Build command: `npm ci --include=dev && npm run build`. Start command: `npm start`. Health check: `/api/health`.
6. Redeploy the latest commit. Check `/api/health`: version must be `3.1.0`; storage should be `postgresql`. The meeting header shows v3.1 to identify this corrected v3 build.
7. Everyone must close old meeting tabs and reload before joining. Mixed old/new clients are not a valid test.

## Corrected issues

- Delayed camera permission is cancelled on Leave; a camera acquired later is stopped.
- Background loading cannot turn the outgoing camera back on after you turn it off. Stale background loads are discarded, and switching devices releases old effect resources.
- Failed joins retain the retry form, including wrong-password correction.
- Temporary startup failures retry automatically and provide a Retry server connection button. Requests time out with useful messages; rate-limit messages tell you to wait.
- Malformed host-recovery URL encoding no longer crashes the page.
- Screen-picker results are discarded after leaving or permission revocation. Sharing state is cleared immediately when the host disables it.
- Recording startup is cancelled when the meeting ends or permission is withdrawn. Stopping a recorder cannot race with a second recorder starting. Audio-mixer startup failures release resources.
- Click sounds no longer suppress simultaneous applause/hand-raise sounds.
- A reconnected poll creator retains their Close poll control.
- Demoting a co-host enforces existing participant recording/sharing restrictions.
- Media replacements are serialized. Settings includes Reconnect media, which retries ICE negotiation without leaving the meeting.
- Missing static assets return explicit errors; meeting pages are not cached across deployment updates.

## What still needs live testing

The full two-browser remote-video test did not receive remote frames in the execution environment. An independent browser ICE-gathering check returned no usable network candidates. This package does not claim verified internet calling or to solve every possible deployment problem.

After deployment, join from two actual devices. Confirm video and audio in both directions, then test an uploaded background and a short recording. If cameras fail across mobile/work/school networks, check Settings > Connection recovery, try Reconnect media, and configure a TURN relay using the existing README environment-variable instructions. Neon stores room data; it is not a media relay. No TURN credentials are bundled.

Mobile screen sharing still requires a browser that exposes screen capture. Unsupported browsers can view presentations but cannot broadcast the phone screen. This remains a web app, not a native phone screen-capture app. Mobile recording requires the browser's recording, canvas and audio capabilities; keep the page visible and phone unlocked.

If the site still fails, provide its public URL, device/browser and the exact failing step or error screenshot. Do not share DATABASE_URL, host recovery links or private credentials.

## Developer checks

- `npm test`: server/logic regressions.
- `npm run build`: asset validation plus production build.
- `npx playwright install chromium --only-shell`, then `npm run test:browser:regression`: targeted browser checks in two fresh-server groups to avoid exceeding the production room-creation rate limit.
- `npm run test:browser`: also includes the full remote-media test; it requires functioning WebRTC networking and can hit rate limits when all room-creation tests are run rapidly against one server. Production throttling has not been disabled to make tests pass.
