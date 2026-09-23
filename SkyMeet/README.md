> SkyMeet appearance update: start with [SKYMEET-CHANGES.md](SKYMEET-CHANGES.md) for the eight themes, preserved behavior and current verification limits. Older v2 notes below describe the original feature release.

# SkyMeet 2.0

Video meetings with four paired light/dark themes, screen sharing, chat, polls, shared notes, **reusable permanent classroom links**, a **collaborative whiteboard studio**, and **attendance history**.

**Read [UPGRADE-v2.md](UPGRADE-v2.md) first** for the new features, exact setup, limits, host-link recovery and attendance rules. This is source code ready for deployment, not an already deployed service. Live-device/browser checks remain outstanding.

## Render Free setup

Upload the extracted project contents to a GitHub repository with `package.json` at its root. In Render choose **New → Web Service**, connect that repository, choose Node runtime and **Free** instance type.

| Field | Value |
|---|---|
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Root directory | Blank when package.json is at the repository root |
| `NODE_VERSION` | `24.19.0` |
| `NODE_ENV` | `production` |
| `HOST_ACCESS_KEY` | Your private room-creation key; omit only if anybody should be able to create rooms |
| `DATABASE_URL` | External PostgreSQL connection URL for permanent rooms/history |

`render.yaml` defines just one free web service and generates a host creation key. Manual Web Service setup also works; no paid disk or database is silently created. You must supply your own PostgreSQL database for durable data. On first startup the app creates `academy_meet_rooms_v2` if it does not exist. Existing unrelated tables are untouched. The provider's storage, availability and charges are separate from Render's free service.

The creator becomes the meeting host automatically. Students need only the normal meeting link, optional password and host admission. Keep the private host-recovery link secret. `HOST_ACCESS_KEY` controls room creation; it is not the per-room ownership key.

Without `DATABASE_URL`, the app runs honestly labeled **temporary mode** and disables permanent-room creation. No local SQLite or disk storage is used. Permanent rooms require selecting the permanent option when created; merely adding a database does not migrate temporary rooms.

## Existing calling features

- Camera/microphone preview and device selection, audio-only join, camera/microphone toggles.
- Host admission and waiting room, meeting password, host/co-host roles, lock room, remove participants, mute/request-unmute, restrict chat/screen sharing/whiteboard editing.
- Camera plus separate screen-sharing tracks, optional browser-provided screen audio, pinning, fullscreen, chat downloads, applause, raised hands.
- Local screen/tab recording through MediaRecorder with a consent reminder and visible recording indicator. It captures only the selected surface/audio offered by the browser, not an automatic all-participant mix. It may omit the recorder's own microphone. It uses RAM and stops after 20 minutes; restart for another segment.

## TURN and network compatibility

WebRTC peer-to-peer mesh is capped at **8 simultaneous participants**, with 2–4 a sensible starting point for typical phones/networks. The server handles signaling; participants send media directly to each other or through an external TURN relay. More participants require an SFU and more engineering/infrastructure.

STUN-only calls can fail on restricted networks. Configure a separate TURN relay/provider if needed; Render's HTTP service is not a TURN relay. Set either:

```dotenv
TURN_URLS=turn:relay.example.com:3478?transport=udp,turns:relay.example.com:5349?transport=tcp
TURN_SECRET=your-coturn-rest-auth-secret
```

Or use your provider's `TURN_USERNAME` and `TURN_PASSWORD` with `TURN_URLS`. HMAC credentials last 24 hours; the current implementation does not refresh them during an extremely long uninterrupted call. Permanent links do not mean calls can run forever. Follow your relay's official setup/firewall/TLS instructions. Relay hosting/bandwidth may cost money. No relay was provisioned or verified in this delivery.

## Local development and tests

Node 22+ and npm are required.

```bash
npm ci --include=dev
cp .env.example .env
npm run build
npm start
```

Open http://localhost:3000. Use HTTPS for non-localhost camera/microphone access. For hot reload use `npm run server` and `npm run dev` in separate terminals. Vite proxies `/api` and `/socket.io`; leave APP_ORIGIN blank in development. Set APP_ORIGIN to the exact public HTTPS origin, without a trailing slash, in production if desired.

```bash
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Use a test environment with no real host creation key for the included browser suite. Tests never need your production database. SQL tests use a PostgreSQL emulator and lifecycle tests use an injected store. These do not replace real database/deployment acceptance checks. See `TEST-RESULTS.md`.

## Important limits

Render free-service cold starts, restarts and workspace usage limits remain. Durable data depends on keeping the same database and hostname, valid credentials, and backups. “Permanent” means no app-set link expiry; it is not a lifetime infrastructure guarantee. Do not use an expiring free database for long-term classrooms. Check current Render/provider documentation before deploying: https://render.com/docs/free and https://render.com/docs/websocket .

This is an original board with common Miro-style essentials, not Miro or an exact feature/UI clone. Advanced Miro features and other unfinished premium-meeting items remain outside this release. No paid-account features are bypassed.

There is no verified user-account system, enrolled roster, scheduling/calendar integration, persistent chat, cloud recording, background replacement, live captions, breakout rooms or tuition-manager data integration. See the full feature/limit descriptions in `UPGRADE-v2.md`.

WebRTC media is encrypted in transport; this app does not implement independent identity-verified end-to-end encryption. Host audio/video commands rely on cooperating clients and cannot cryptographically prevent a modified WebRTC peer from sending media. Guests can unmute themselves. Recording consent is an honor-based prompt, not a per-participant enforced workflow. Obtain everyone's permission and test playback first. Self-declared names and browser keys do not prove student identity.

## Troubleshooting

- **Permanent option disabled:** Add a valid DATABASE_URL and restart/deploy. The startup database user must be able to create/use the namespaced table. Never expose the connection string to the frontend.
- **Guest says host has not started:** Host must reopen the saved room or private recovery link to start the next session.
- **Lost host access:** Use your saved private recovery link. The public link cannot grant ownership. This edition has no account-based recovery.
- **Save conflict or database error:** Export your board, stop duplicate application instances sharing the table, check database access, and restart. Do not dismiss errors and assume changes are durable.
- **Names/chat work but video does not:** Verify browser permissions and TURN connectivity across actual networks.
- **Recording has no audio:** Select tab audio where offered; browser/system support varies. Test an exported recording.
- **Upgrading from v1.1:** Export active temporary-room data first. This version creates new persistent rooms; it does not reconstruct old in-memory meetings after a restart.

Source modules: `server/app.js` (meeting server), `server/store.js` (PostgreSQL snapshots), `server/board.js` (validated board operations/history), `src/BoardStudio.jsx` (whiteboard), `src/Attendance.jsx` and `shared/attendance.js` (attendance), `src/main.jsx` (app), `src/rtc.js` (WebRTC).
