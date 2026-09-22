# Supreme Meet — Community Edition 1.0

A self-hostable small-group video calling app branded **Supreme Meet / @supremegenz**. React + Vite, Express, Socket.IO and browser WebRTC. Deploy the frontend and signaling server together on **one Render Free Web Service**. No paid disk, database or conferencing subscription is required to start.

This is a functional first release, **not a finished replacement for all paid Google Meet capabilities**. The black/crimson creator theme and SG monogram are original provisional artwork; the channel's actual logo/banner could not be retrieved. The header links to https://www.youtube.com/@supremegenz. The app does not stream to YouTube.

## Start here: Render FREE deployment

1. Extract this ZIP. Create a new GitHub repository and upload the **contents of `supreme-meet/`**. `package.json`, `package-lock.json` and `render.yaml` must be at the repository root. Include `public/`, `src/`, `server/`, `tests/`, `index.html`, `vite.config.js` and the other project files. Do not upload `node_modules/` or a real `.env` file.
2. In Render choose **New → Web Service**, connect that repository, and select **Node** runtime.
3. Use these values:

   | Field | Value |
   |---|---|
   | Name | `supreme-meet` (or any available name) |
   | Root directory | blank if package.json is at repository root; otherwise `supreme-meet` |
   | Build command | `npm ci --include=dev && npm run build` |
   | Start command | `npm start` |
   | Instance type | **Free** |
   | Health check | `/api/health` |

4. In Environment add `NODE_ENV=production`, `NODE_VERSION=24.19.0`, and `HOST_ACCESS_KEY` set to a long random secret (at least 32 random characters). Keep this key private: it allows room creation. Guests only need the meeting link, optional room password, and host admission. Use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` locally to generate a key.
5. Click **Deploy Web Service**. Once live, open the Render HTTPS URL. Enter your host key and create a meeting. Allow camera/microphone access, enter the room, and copy its invite link.
6. Test from another device/browser. The host must click **Admit** in the Participants panel. Use headphones or mute one device when testing nearby.
7. Optionally set `APP_ORIGIN` to the exact final URL, e.g. `https://supreme-meet-xxxx.onrender.com`, without a trailing slash. Redeploying/restarting clears active rooms.

**No Blueprint is required.** Manual Web Service creation above avoids adding any paid resource. A free-only `render.yaml` is also included for those using Blueprints. That route generates `HOST_ACCESS_KEY`; retrieve it in the service's Environment settings. Do not create a database or attach a disk for this edition.

## What is implemented

- Instant named meetings, random nonsequential invite codes, optional room password.
- Private pre-join camera/microphone preview, audio-only or no-media join.
- Host-key-gated room creation; bearer-token host ownership saved in that browser tab's session storage.
- Waiting-room admission/decline, up to 8 admitted participants, meeting lock.
- Peer-to-peer camera and audio, microphone/camera toggles, device selection, automatic browser echo-cancellation/noise-suppression requests.
- Separate screen-sharing track alongside camera, screen audio when the browser offers it.
- Responsive participant grid, pinning, sharing-focused layout and fullscreen.
- Chat, applause reactions, raised hands, participant connection states.
- Host/co-host roles, mute, request-unmute, removal, chat/share restrictions, ending the meeting for everyone.
- Live collaborative whiteboard, color selection, host clear, PNG download.
- Shared notes with debounced last-write-wins updates, text download.
- Single live poll with up to 6 choices, changeable votes, totals and host close.
- Local recording of the chosen browser capture surface; browser-provided captured audio only. Visible REC indicator and consent reminder. Stop automatically at 20 minutes to limit memory; start another segment if needed.
- Chat text download and host attendance CSV with per-connection join/leave durations.
- Transport reconnection and re-admission using a per-participant token when the same server process is still running; limited automatic ICE restart attempts.
- Dark/light meeting themes, mobile layout, rate limits, same-origin checks, security headers, bounded message sizes and server-side role checks.

## Important free-hosting and privacy limits

- **Temporary rooms only.** Rooms, passwords, roles, chat, notes, polls, whiteboards, sessions and attendance exist in server memory. They disappear on restart, redeploy or free-service spin-down. This is deliberate: there is no SQLite database or falsely persistent local disk storage. Host creates a new room if the server restarts.
- Empty rooms expire after 10 minutes; all rooms have a 12-hour lifetime. There is no persistent scheduling or reusable permanent room in v1.
- Render currently spins down free services after 15 minutes without inbound HTTP/WebSocket traffic, and a wake-up can take about one minute. Render may restart free services at any time. Free allowances are workspace-wide; the app does not artificially ping Render to evade idle limits.
- Render's free service is for hobby/testing workloads, not an uptime guarantee. Other services in the same account share quotas. Monitor your account's usage and spending settings. Free Render Postgres expires after 30 days; this app does not create one.
- **Some networks need TURN.** STUN-only calls can fail across restrictive NATs/firewalls. An external TURN server can incur bandwidth/hosting charges even though this app has no paid feature gates. Reliable worldwide calling cannot be promised at zero infrastructure cost.
- Mesh has N−1 media connections per participant. The default cap is 8, not a performance guarantee; 2–4 is a more comfortable starting point, especially on phones. Video defaults to 360p/20fps. An SFU and stronger infrastructure are needed for larger rooms.
- WebRTC encrypts media in transport; the app does not implement independently verifiable end-to-end identity encryption. Signaling, chat, notes and other collaboration data pass through the server.
- Host moderation is enforced for server actions. Camera/microphone mute and share-stop requests are obeyed by this client, not cryptographically enforced against a modified WebRTC peer. Muted users can unmute themselves. Removed users with a new session can request admission again unless the room is locked. These are not enterprise moderation guarantees.
- Meeting metadata is visible to anyone with the unguessable link; media/collaboration access requires admission. Tokens are bearer secrets. Never share host tokens, session storage, or your host creation key. Losing the host tab/session may lose ownership.
- Recording requires consent from everyone. The consent confirmation is an honor-based prompt, **not a per-participant enforced consent workflow**. The app cannot prevent OS-level recording by another participant.
- Recording is local browser capture, not cloud recording or an automatically mixed meeting recording. Select the meeting tab and its audio option. Your own microphone may be absent. Test playback before relying on it. The file is accumulated in RAM until downloaded; mobile/low-memory devices may fail. No video is stored on Render by this app.
- Names and attendance are self-declared and not verified identities. Export data before ending a room. Never use this build for sensitive or regulated meetings without an independent security review.

Official Render references (checked 22 September 2026):
https://render.com/docs/free
https://render.com/docs/deploy-node-express-app
https://render.com/docs/websocket

## TURN setup (optional but recommended)

Render's HTTP Web Service is **not** a TURN server. Run coturn on a separate suitable server or use a TURN provider. Configure relay ports/firewall/TLS/DNS according to that provider's official documentation. This ZIP neither provisions nor pays for a relay.

Set Render environment variables:

```dotenv
TURN_URLS=turn:relay.example.com:3478?transport=udp,turns:relay.example.com:5349?transport=tcp
TURN_SECRET=the-same-auth-secret-configured-in-coturn
```

The app issues time-limited HMAC-SHA1 credentials to admitted participants, compatible with coturn REST-style authentication (`use-auth-secret`, `static-auth-secret`, and a configured realm on the relay). Credentials expire after 24 hours, longer than the maximum room lifetime. If the provider gives static credentials instead, set `TURN_USERNAME` and `TURN_PASSWORD` and omit `TURN_SECRET`. Static credentials are necessarily visible to admitted clients; restrict usage on the relay. `TURN_URLS` alone does not provision anything. Verify actual relay connectivity on different networks; a configuration flag is not a relay health check.

## Local development

Requires Node 22+ (Render config pins Node 24.19.0) and npm.

```bash
npm ci
cp .env.example .env
npm run build
npm start
```

Open http://localhost:3000. HTTPS or localhost is required for camera/microphone access. An insecure LAN IP is not enough. To develop with hot reload, run `npm run server` in one terminal and `npm run dev` in another, then open the Vite URL. Vite proxies `/api` and `/socket.io`; leave APP_ORIGIN empty for local development. By default the local creation key is unset; configure it before public deployment.

## Tests

```bash
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite uses simulated camera/microphone streams in two independent browser contexts, not human devices on different networks. It covers waiting-room admission, decoded bidirectional video, chat, hand raising, notes, polls, mute/camera controls, ending the meeting and mobile landing layout. Server tests cover authentication tokens/host access key, origin checks, password access, authorization, waiting-room isolation, capacity, role controls, polls, whiteboard validation, notes, reconnection and revocation. See `TEST-RESULTS.md` for this delivery's actual results.

Manual checks before using with your crew: two physical devices on different networks; iOS/Android permissions; screen-sharing audio; recording playback and consent; host reconnection; TURN relay connectivity; restart/expiry messaging; exports. Screen capture and codecs differ by browser. Desktop Chrome/Edge is a useful starting point, not a blanket compatibility guarantee.

## Not yet implemented from the original premium wishlist

Persistent accounts/password recovery, profiles/avatars, PostgreSQL integration, scheduled meetings/calendar invitations, permanent rooms, durable history/cloud recording, file uploads, breakout rooms, virtual backgrounds/blur, captions/transcripts/translation, speaker detection/active-speaker layout, actual network-quality metrics, selectable audio output, PWA offline installation, keyboard shortcuts, whiteboard shapes/text/undo, audit history and bulk waiting-room actions are **not included in v1**. No fake buttons for these features are shipped.

Next architecture: external persistent PostgreSQL for accounts/metadata; private object storage for files; external SFU for larger meetings; real recording/consent service if needed. These are separate engineering tasks and may have infrastructure costs. No external accounts or services have been created for you, and the source has not been deployed to Render yet.

## Source layout

`server/app.js` — HTTP routes, ephemeral rooms, permissions and Socket.IO signaling

`server/index.js` — port binding and graceful shutdown

`src/rtc.js` — mesh WebRTC connections, camera/screen tracks and ICE recovery

`src/main.jsx` — meeting UI and collaboration tools

`src/style.css` — Supreme creator theme and responsive layouts

`public/icon.svg` — replaceable original Supreme Meet monogram

`tests/` — automated server and browser tests

`render.yaml` — single free web-service deployment configuration

## Troubleshooting

**Host access key rejected:** Copy the complete Render `HOST_ACCESS_KEY` value. This is not your Render password.

**No room after a redeploy:** Expected for temporary mode. Create and share a fresh room.

**Guest waiting forever:** Host must enter the room and admit them in Participants. Verify host is using the same tab/session that created it.

**Camera denied:** Use HTTPS, allow browser permissions, close other camera apps, or choose Audio only. You can join with no media.

**Names/chat work but video fails:** Test another network, verify firewall permissions and TURN configuration. Signaling can work while direct media cannot.

**No audio:** Tap 'Tap to play media' if shown, check system output/volume, check mute controls, and verify an actual audio input exists.

**Browser refresh or brief network loss:** The session token attempts automatic re-entry if the room still exists. Media must be re-enabled after a full page reload; your browser may prompt again. Do not open the same host token in multiple live tabs.

**Service build says package.json not found:** Fix the Render root directory or upload project contents at repository root.

**Site is slow on first visit:** Free Render cold starts are expected; wait about a minute. This application does not remove provider limitations.
