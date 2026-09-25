> **SkyMeet v3 — New / corrected build 3.1.0.** Start with [START-HERE-V3-NEW.md](START-HERE-V3-NEW.md).

# SkyMeet v2

**Feature release · package 3.1.0.** Read [UPGRADE-SKYMEET-V3.md](UPGRADE-SKYMEET-V3.md) before updating an existing Render/Neon deployment.

**A shared space for video meetings, ideas, and teamwork.**

SkyMeet combines browser-based meetings with a collaborative canvas, shared notes, room chat, and eight coordinated color themes. It uses a React frontend, a Node.js server, and optional PostgreSQL storage for permanent meeting rooms.

> This repository contains a complete web application. Deploy the full project: opening `index.html` directly or using GitHub Pages alone does not provide the server required for meetings and collaboration.

## Features

- **Meetings:** camera and microphone preview, audio-only joining, device selection, screen sharing, participant pinning, and fullscreen mode.
- **Collaboration:** room chat, shared notes, reactions, raised hands, and polls.
- **Whiteboard:** sticky notes, text, shapes, connectors, freehand drawing, images, frames, workshop and Kanban templates, pan/zoom, undo/redo, and exports.
- **Comfortable workspace:** floating tool panels, a collapsible canvas inspector, and responsive layouts.
- **Room management:** host-approved entry, optional meeting passwords, co-hosts, room locking, and participant controls.
- **Permanent rooms:** reusable links with saved boards, notes, and attendance when PostgreSQL is configured.
- **Exports:** board PNG/SVG/JSON, chat and notes downloads, and attendance CSV reports.
- **Local recording:** records the meeting video grid and available participant audio, including on compatible mobile browsers. Host permission controls participant recording.

Participants can use collaboration tools by default. Hosts retain administrative controls and can restrict chat, screen sharing, or board editing.

## Themes

| Theme | Dark mode | Light mode |
| --- | --- | --- |
| 1 | Red & black | Pink & white |
| 2 | Green & purple | Light green & lavender |
| 3 | Red & blue | Dark coral & sky blue |
| 4 — default | Navy blue & black | Baby blue & white |

New browsers start with navy blue and black. The first switch to light mode uses baby blue and white. Each mode remembers its own color choice in that browser. The whiteboard retains a light drawing surface for readable content.

## Technology

| Layer | Technology |
| --- | --- |
| Interface | React, Vite, CSS, Lucide icons |
| Server | Node.js, Express |
| Live collaboration and signaling | Socket.IO |
| Audio/video | WebRTC peer-to-peer connections |
| Persistent storage | PostgreSQL through `pg`; compatible with Neon |
| Tests | Node test runner, Playwright, pg-mem |

## Run locally

Use Node.js **22 or newer**. The supplied Render configuration pins Node.js `24.19.0`.

1. Clone or download this repository and open a terminal in the directory containing `package.json`.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Copy `.env.example` to `.env`. Fill in the values you need. Leave `DATABASE_URL` empty to try temporary rooms without a database.
4. Build and start:

   ```sh
   npm run build
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000).

Camera and microphone access require HTTPS on deployed sites; localhost is supported for development.

## Deploy with Render and Neon

### 1. Prepare the repository

Upload the extracted project contents to GitHub. Keep `package.json`, `package-lock.json`, `index.html`, `src/`, and `server/` at the repository root. Upload the project files, not just the ZIP archive.

Do not commit `.env`, database credentials, or private host keys.

### 2. Connect Neon

1. Open the [Neon Console](https://console.neon.tech).
2. Create a project, or reuse the existing SkyMeet database to preserve its saved rooms.
3. Click **Connect** and select the intended branch, database, and role.
4. Copy the PostgreSQL connection URL. Keep its SSL parameters, including `sslmode=require` when supplied.
5. Store this URL as `DATABASE_URL` in Render. Paste the URL only, without a surrounding `psql` command or quotation marks.

The app creates its storage table automatically during startup. No manual SQL setup is needed.

### 3. Configure Render

Open the [Render Dashboard](https://dashboard.render.com). Update the existing service, or choose **New → Web Service** and connect the GitHub repository.

| Setting | Value |
| --- | --- |
| Name | `skymeet` or an available name |
| Runtime | Node |
| Root directory | Leave blank when `package.json` is at the repository root |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Instance type | Free, if suitable for your usage |

Add these environment variables:

| Variable | Value or purpose |
| --- | --- |
| `DATABASE_URL` | Private Neon PostgreSQL connection URL |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24.19.0` |
| `HOST_ACCESS_KEY` | A strong private key used to create rooms |
| `MAX_PARTICIPANTS` | `8` |
| `MAX_ROOMS` | `100`, or a lower limit |
| `APP_ORIGIN` | Optional exact public origin, such as `https://your-service.onrender.com`; omit to derive it from the request host |

Render supplies the listening port. This app does not require a persistent Render disk when using Neon.

Save the environment changes and deploy. The included `render.yaml` also describes a free web service, but `DATABASE_URL` must still be configured.

### 4. Verify deployment

Visit your deployed site's `/api/health` endpoint. With PostgreSQL configured, the expected response for this package is:

```json
{"ok":true,"version":"3.1.0","storage":"postgresql"}
```

Then:

1. Create a meeting with **Permanent room link** selected.
2. Save the private host recovery link somewhere safe.
3. Join from another browser or device and admit the participant.
4. Test audio/video, chat, shared notes, and whiteboard image upload.
5. Reopen the permanent room as its host and confirm saved content is available.

The health response reports the configured storage mode; a successful permanent-room save and reopen checks actual persistence.

## Using the whiteboard

Open **Whiteboard → Open full whiteboard**.

- Choose **Add image** to upload PNG, JPEG, or WebP files.
- Use Select to move objects and the blue corner handle to resize them.
- Shift-click to select multiple objects.
- Use the inspector to edit selected text and styling.
- Pan with the hand tool or Alt-drag; use Ctrl/⌘-scroll to zoom.
- Use **Hide tools** to collapse the inspector and expand the canvas.
- Export PNG or SVG for sharing, or JSON for backup/import.

Image uploads must be below 10 MB before processing. The existing compressor also limits the embedded image to 400,000 characters. A board supports up to 1,500 objects and 6 MB of serialized data. JSON imports support up to 100 objects per file.

## Data and access

| Item | Behavior |
| --- | --- |
| Permanent rooms | PostgreSQL stores room configuration, board objects, notes, and attendance |
| Temporary rooms | In-memory only; lost when the server restarts |
| Chat and polls | Session-only; not retained as permanent room history |
| Theme preferences | Stored in the current browser |
| Host ownership keys | Stored locally; private recovery links support access on another device |
| Recordings | Downloaded locally; not automatically uploaded |

Adding `DATABASE_URL` does not migrate existing temporary rooms. Select the permanent option when creating a new room.

`HOST_ACCESS_KEY` controls who can create rooms. It is separate from each room's private ownership/recovery key. Guests use the ordinary invitation link, optional room password, and host admission.

When updating an existing deployment, retain its database, hostname, credentials, and private recovery links. Internal legacy storage identifiers are intentionally preserved for compatibility with existing rooms and board backups.

## Calling and recording limits

SkyMeet uses peer-to-peer WebRTC rather than a conferencing media server. The default limit is eight participants; real capacity depends on devices and network conditions. Raising a limit alone does not make the architecture suitable for large meetings.

Some networks require a TURN relay. Configure either:

- `TURN_URLS` and `TURN_SECRET` for supported shared-secret TURN credentials; or
- `TURN_URLS`, `TURN_USERNAME`, and `TURN_PASSWORD` for static credentials.

`STUN_URL` defaults to `stun:stun.l.google.com:19302`. Render's web service is not itself a TURN relay.

Shared notes use **revision checks**. Concurrent changes preserve your local draft and show controls to review/use the latest shared version or explicitly save your draft instead. In-app Leave flushes pending notes before disconnecting.

Local recording composes the meeting video grid and mixes available local/remote microphone and screen audio. Chat, whiteboard and notes are not captured. It requires MediaRecorder, canvas capture and Web Audio support; keep the page visible and the device unlocked. Recording stays in memory until saved, with a 20-minute / 150 MB limit. Obtain participant consent first. The host permission switch controls SkyMeet recording, not external device recorders.

Free hosting can introduce cold starts and usage limits. Provider plans and limits may change; review the current documentation linked below.

## Testing

```sh
# Server and data tests
npm test

# Server tests followed by a production build
npm run check

# Install the browser, build, and run browser tests
npx playwright install chromium
npm run build
npm run test:browser
```

Validation for this release is recorded in [TEST-RESULTS.md](TEST-RESULTS.md). Browser negotiation now checks both directions and camera/screen separation. Live internet media still requires the two-device acceptance test in the upgrade guide.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Render cannot find `package.json` | Upload extracted files and correct the Root Directory setting |
| Site shows temporary mode | Set `DATABASE_URL` on the correct Render service and redeploy |
| Database connection fails | Verify the Neon branch/database, credentials, SSL parameters, and service logs |
| Room creation asks for a key | Enter the configured `HOST_ACCESS_KEY` |
| Old host access is missing | Use the private host recovery link and original site hostname |
| Camera/microphone unavailable | Use HTTPS and allow browser permissions |
| Chat works but calls do not connect | Check network restrictions and configure a working TURN relay |
| Shared notes show a conflict | Review the latest shared notes and choose whether to use them or save your preserved draft |
| Image upload is rejected | Use PNG/JPEG/WebP; crop or reduce the image to meet the limits |
| Old rooms disappeared after restarting | Temporary rooms are not persistent; use permanent rooms with PostgreSQL |

## Deployment references

- [Render: Deploy a Node Express app](https://render.com/docs/deploy-node-express-app)
- [Render: Environment variables](https://render.com/docs/configure-environment-variables)
- [Render: Free service limits](https://render.com/docs/free)
- [Neon: Connect an application](https://neon.com/docs/connect/connect-from-any-app)

## New in v3

- Upload your own photo or muted looping video as a virtual background in Settings. Enable the camera first. Processing and source files stay on your device; only the resulting camera video is sent to peers. Maximum input size: 80 MB. Device changes reset the background.
- Meeting sounds for applause, raised hands, other reactions and incoming chat; master toggle plus separate optional button clicks. Sound preferences are saved on this browser. Sounds require an initial tap/click and are never injected into outgoing audio.
- Chat pop-ups when the chat panel is closed, sender previews, an unread badge, and an alerts toggle. These are in-app alerts, not operating-system push notifications.
- Participants can create polls; the host can disable creation. Only the creator or a host can close a poll. Guests cannot replace an open poll. Voting remains available when creation is disabled.
- Hosts can disable participant recording, which stops the app recorder and makes the captured portion available to save. Hosts/co-hosts retain recording access. Both participant permissions default to enabled, including migrated rooms.
- Mobile screen sharing is capability-detected. Most phone browsers cannot initiate screen capture; they can view shared screens. A desktop browser is required to present when this API is absent. Installing the site as a PWA does not grant native screen capture.
- Recording no longer requires screen capture. Use **Record locally**, then **Stop recording**, then **Save recording**. The format is selected based on browser support (WebM or MP4). Save before refreshing, closing the tab or starting another recording. Mobile suspension, memory limits and codecs still require testing on your actual phone.

Bundled MediaPipe runtime/model files are under `public/background`; upload this entire directory to GitHub. No background service or additional Neon schema is needed.
