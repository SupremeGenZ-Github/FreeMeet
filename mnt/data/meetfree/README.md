# MeetFree
A simple Google-Meet-style video calling app that can be deployed to Render.

## Included
- Multi-person browser video/audio via WebRTC
- Room codes + shareable invite URL
- Mute/unmute microphone
- Camera on/off
- Screen sharing
- Local browser recording to WebM
- In-meeting text chat
- Participant list + host indicator
- Raise hand
- Emoji reactions
- Responsive mobile layout
- Socket.IO signaling server
- Render deployment config

## Deploy to Render
1. Push this folder to GitHub.
2. In Render, create a **Web Service** from the repository.
3. Render can use the included `render.yaml`, or set:
   - Build command: `npm install`
   - Start command: `npm start`
4. Open the HTTPS Render URL. Allow camera/microphone permissions.

## Notes
This is an MVP, not a full replacement for Google Meet. The included signaling server is intentionally simple and uses in-memory room state. For large meetings, add an SFU such as LiveKit/mediasoup/Janus, persistent auth/database, TURN credentials, moderation, rate limits, and recording storage.

### Free hosting reality
Render's free web services can sleep and have resource limits. WebRTC media flows peer-to-peer between browsers; the Render server mainly handles signaling, which keeps bandwidth costs lower for small rooms.
