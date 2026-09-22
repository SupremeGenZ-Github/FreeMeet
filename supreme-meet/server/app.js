import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { randomBytes, createHash, createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';

const clean = (s, max = 80) => typeof s === 'string' ? s.trim().slice(0, max) : '';
const token = () => randomBytes(24).toString('base64url');
const hash = s => createHash('sha256').update(s).digest();
const equal = (a, b) => timingSafeEqual(hash(a), hash(b));
const safePassword = p => scryptSync(p, 'supreme-meet-room-password-v1', 32).toString('hex');
const publicPeer = p => ({ id: p.id, name: p.name, role: p.role, hand: p.hand, mic: p.mic, camera: p.camera, sharing: p.sharing, recording: p.recording, joinedAt: p.joinedAt });

export function createApp(options = {}) {
  const env = { ...process.env, ...options.env };
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: { 'connect-src': ["'self'", 'ws:', 'wss:'], 'img-src': ["'self'", 'data:', 'blob:'], 'media-src': ["'self'", 'blob:'], 'style-src': ["'self'", "'unsafe-inline'"] } } }));
  app.use(express.json({ limit: '8kb' }));
  const originAllowed = req => !req.headers.origin || req.headers.origin === (env.APP_ORIGIN || `${req.headers.origin.startsWith('https:') ? 'https' : 'http'}://${req.headers.host}`);
  app.use('/api', (req, res, next) => originAllowed(req) ? next() : res.status(403).json({ error: 'Origin not allowed' }));
  app.use('/api', rateLimit({ windowMs: 60000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));
  const server = createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 64 * 1024, allowRequest: (req, cb) => cb(null, originAllowed(req)) });
  const rooms = new Map();
  const joinAttempts = new Map();
  const maximum = Math.min(8, Math.max(2, Number(env.MAX_PARTICIPANTS) || 8));
  const emitState = r => {
    io.to(r.code).emit('state', { code: r.code, title: r.title, createdAt: r.createdAt, locked: r.locked, chatEnabled: r.chatEnabled, shareEnabled: r.shareEnabled, participants: [...r.members.values()].map(publicPeer) });
    for (const p of r.members.values()) if (p.role !== 'guest') io.to(p.id).emit('waiting', [...r.waiting.values()].map(p => ({ id: p.id, name: p.name })));
  };
  function endRoom(r, reason = 'The host ended this meeting.') {
    io.to(r.code).emit('ended', reason);
    for (const p of [...r.members.values(), ...r.waiting.values()]) {
      const s = io.sockets.sockets.get(p.id);
      s?.emit('ended', reason); s?.leave(r.code); if (s) s.data = {};
    }
    rooms.delete(r.code);
  }
  const cleanup = setInterval(() => {
    for (const [ip, limit] of joinAttempts) if (Date.now() - limit.at > 60000) joinAttempts.delete(ip);
    for (const r of rooms.values()) if (Date.now() - r.createdAt > 12 * 3600000 || (r.emptySince && Date.now() - r.emptySince > 10 * 60000)) endRoom(r, 'This temporary meeting expired. Please create a new one.');
  }, 60000);
  cleanup.unref();
  app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0', storage: 'temporary-memory' }));
  app.get('/api/config', (_req, res) => res.json({ hostKeyRequired: !!env.HOST_ACCESS_KEY, maxParticipants: maximum, turnConfigured: !!(env.TURN_URLS && (env.TURN_SECRET || (env.TURN_USERNAME && env.TURN_PASSWORD))) }));
  app.post('/api/rooms', rateLimit({ windowMs: 60000, limit: 8, standardHeaders: true, legacyHeaders: false }), (req, res) => {
    if (env.HOST_ACCESS_KEY && !equal(clean(req.body.hostKey, 256), env.HOST_ACCESS_KEY)) return res.status(403).json({ error: 'Incorrect host access key.' });
    if (rooms.size >= (Number(env.MAX_ROOMS) || 100)) return res.status(503).json({ error: 'Server is at capacity. Please try later.' });
    const code = randomBytes(9).toString('hex').match(/.{6}/g).join('-');
    const hostToken = token();
    const password = clean(req.body.password, 128);
    const r = { code, title: clean(req.body.title) || 'Supreme hangout', hostHash: hash(hostToken).toString('hex'), passwordHash: password ? safePassword(password) : '', createdAt: Date.now(), emptySince: Date.now(), locked: false, chatEnabled: true, shareEnabled: true, members: new Map(), waiting: new Map(), sessions: new Map(), attendance: [], messages: [], board: [], notes: '', poll: null };
    rooms.set(code, r);
    res.status(201).json({ code, hostToken, title: r.title });
  });
  app.get('/api/rooms/:code', (req, res) => {
    const r = rooms.get(req.params.code);
    if (!r) return res.status(404).json({ error: 'Meeting not found. It may have ended or the server restarted. Ask the host for a new link.' });
    res.json({ title: r.title, code: r.code, locked: r.locked, passwordRequired: !!r.passwordHash });
  });
  function iceServers() {
    const result = env.STUN_URL === 'none' ? [] : [{ urls: env.STUN_URL || 'stun:stun.l.google.com:19302' }];
    if (env.TURN_URLS) {
      const urls = env.TURN_URLS.split(',').map(s => s.trim());
      if (env.TURN_SECRET) { const username = `${Math.floor(Date.now() / 1000) + 86400}:${randomBytes(6).toString('hex')}`; result.push({ urls, username, credential: createHmac('sha1', env.TURN_SECRET).update(username).digest('base64') }); }
      else if (env.TURN_USERNAME && env.TURN_PASSWORD) result.push({ urls, username: env.TURN_USERNAME, credential: env.TURN_PASSWORD });
    }
    return result;
  }
  io.on('connection', socket => {
    let tick = Date.now(), count = 0;
    socket.use((_packet, next) => { if (Date.now() - tick > 10000) { tick = Date.now(); count = 0; } if (++count > 400) return next(new Error('Too many messages.')); next(); });
    function context(host = false) {
      const r = rooms.get(socket.data.code); const p = r?.members.get(socket.id);
      if (!r || !p) throw new Error('Join the meeting first.');
      if (host && p.role === 'guest') throw new Error('Host permission required.');
      return { r, p };
    }
    function on(event, fn) { socket.on(event, (data, ack) => { try { const result = fn(data || {}); if (typeof ack === 'function') ack({ ok: true, ...result }); } catch (e) { if (typeof ack === 'function') ack({ ok: false, error: e.message }); } }); }
    function admit(r, s, p) {
      if (r.members.size >= maximum) throw new Error(`This meeting is limited to ${maximum} participants.`);
      r.waiting.delete(s.id); r.members.set(s.id, p); r.emptySince = null;
      s.join(r.code); s.data.code = r.code;
      r.attendance.push({ id: p.id, name: p.name, joinedAt: p.joinedAt, leftAt: null });
      s.emit('admitted', { selfId: s.id, iceServers: iceServers(), messages: r.messages, board: r.board, notes: r.notes, poll: publicPoll(r.poll) });
      emitState(r);
    }
    on('join', d => {
      // Trust Render's immediate proxy only (rightmost forwarded IP), never a
      // client-supplied leftmost entry. Apply before password hashing.
      const forwarded = socket.handshake.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',').at(-1).trim() : socket.handshake.address;
      const now = Date.now();
      let limit = joinAttempts.get(ip);
      if (!limit || now - limit.at > 60000) { limit = { at: now, count: 0 }; joinAttempts.set(ip, limit); }
      if (++limit.count > 30) throw new Error('Too many join attempts. Please wait one minute.');
      if (socket.data.code) throw new Error('Already joined or waiting.');
      const r = rooms.get(clean(d.code)); if (!r) throw new Error('Meeting no longer exists. Ask the host for a new link.');
      if (r.attendance.length >= 5000) throw new Error('Meeting connection limit reached. Please create a new room.');
      const name = clean(d.name, 40); if (!name) throw new Error('Enter your name.');
      const owner = typeof d.hostToken === 'string' && equal(hash(d.hostToken).toString('hex'), r.hostHash);
      const resumeKey = clean(d.resumeToken, 128);
      const session = resumeKey ? r.sessions.get(hash(resumeKey).toString('hex')) : null;
      if (session?.banned) throw new Error('You were removed from this meeting.');
      if (session && [...r.members.values()].some(p => p.sessionId === session.id)) throw new Error('This session is already connected.');
      if (owner && [...r.members.values()].some(p => p.role === 'host')) throw new Error('Host is already connected.');
      if (!owner && !session && r.locked) throw new Error('This meeting is locked.');
      if (!owner && !session && r.passwordHash && !equal(safePassword(clean(d.password, 128)), r.passwordHash)) throw new Error('Incorrect meeting password.');
      if (r.waiting.size >= 30) throw new Error('Waiting room is full. Try later.');
      if (r.sessions.size >= 500 && !session) throw new Error('Meeting session limit reached.');
      const secret = session ? resumeKey : token(); const sessionId = hash(secret).toString('hex');
      const role = owner ? 'host' : session?.role || 'guest';
      const p = { id: socket.id, name, role, sessionId, hand: false, mic: false, camera: false, sharing: false, recording: false, joinedAt: Date.now() };
      r.sessions.set(sessionId, { id: sessionId, role, admitted: owner || !!session?.admitted, banned: false });
      if (owner || session?.admitted) admit(r, socket, p);
      else { socket.data.code = r.code; r.waiting.set(socket.id, p); socket.emit('waiting-room'); emitState(r); }
      return { resumeToken: secret };
    });
    on('admit', d => { const { r } = context(true); const p = r.waiting.get(d.id); const s = io.sockets.sockets.get(d.id); if (!p || !s) throw new Error('Participant has left.'); admit(r, s, p); r.sessions.get(p.sessionId).admitted = true; });
    on('reject', d => { const { r } = context(true); const p = r.waiting.get(d.id); if (!p) return; const s = io.sockets.sockets.get(d.id); s?.emit('ended', 'The host declined your request.'); if (s) s.data = {}; r.waiting.delete(d.id); r.sessions.delete(p.sessionId); emitState(r); });
    on('signal', d => { const { r } = context(); if (!r.members.has(d.to) || d.to === socket.id) throw new Error('Invalid recipient.'); if (!d.description && !d.candidate) throw new Error('Invalid signal.'); io.to(d.to).emit('signal', { from: socket.id, description: d.description, candidate: d.candidate }); });
    on('media', d => { const { r, p } = context(); for (const k of ['mic', 'camera', 'hand', 'sharing', 'recording']) if (typeof d[k] === 'boolean') p[k] = k === 'sharing' && p.role === 'guest' && !r.shareEnabled ? false : d[k]; emitState(r); });
    on('chat', d => { const { r, p } = context(); if (!r.chatEnabled && p.role === 'guest') throw new Error('Chat is disabled.'); const text = clean(d.text, 2000); if (!text) return; const msg = { id: token(), name: p.name, text, at: Date.now() }; r.messages.push(msg); r.messages = r.messages.slice(-200); io.to(r.code).emit('chat', msg); });
    on('reaction', d => { const { r, p } = context(); if (!['👏','❤️','👍','🎉','💡'].includes(d.emoji)) return; io.to(r.code).emit('reaction', { name: p.name, emoji: d.emoji }); });
    on('settings', d => { const { r } = context(true); for (const k of ['locked', 'chatEnabled', 'shareEnabled']) if (typeof d[k] === 'boolean') r[k] = d[k]; if (!r.shareEnabled) for (const p of r.members.values()) if (p.role === 'guest') io.to(p.id).emit('control', { action: 'stop-sharing' }); emitState(r); });
    on('control', d => { const { r, p } = context(true); const target = r.members.get(d.id); if (!target || target.id === p.id || target.role === 'host' || (p.role === 'cohost' && target.role === 'cohost')) throw new Error('Cannot control this participant.'); if (!['mute', 'request-unmute', 'remove', 'cohost', 'guest'].includes(d.action)) throw new Error('Unknown action.'); if (['cohost', 'guest'].includes(d.action)) { if (p.role !== 'host') throw new Error('Only the host can change roles.'); target.role = d.action; r.sessions.get(target.sessionId).role = d.action; emitState(r); } else if (d.action === 'remove') { r.sessions.get(target.sessionId).banned = true; const s = io.sockets.sockets.get(d.id); s?.emit('ended', 'The host removed you from the meeting.'); leave(s); } else io.to(d.id).emit('control', { action: d.action }); });
    on('end', () => { const { r } = context(true); endRoom(r); });
    on('attendance', () => { const { r } = context(true); return { rows: r.attendance }; });
    on('notes', d => { const { r } = context(); r.notes = clean(d.text, 12000); socket.to(r.code).emit('notes', r.notes); });
    on('draw', d => { const { r } = context(); if (r.board.length >= 1000) throw new Error('Whiteboard full. Ask the host to clear it.'); if (!Array.isArray(d.points) || d.points.length < 2 || d.points.length > 400 || !d.points.every(p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(v) && v >= 0 && v <= 1))) throw new Error('Invalid stroke.'); const stroke = { points: d.points, color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#12392d' }; r.board.push(stroke); socket.to(r.code).emit('draw', stroke); });
    on('clear-board', () => { const { r } = context(true); r.board = []; io.to(r.code).emit('board', []); });
    on('poll-create', d => { const { r } = context(true); const question = clean(d.question, 180); const choices = Array.isArray(d.choices) ? d.choices.map(c => clean(c, 80)).filter(Boolean).slice(0, 6) : []; if (!question || choices.length < 2) throw new Error('Add a question and at least two choices.'); r.poll = { question, choices, votes: new Map(), closed: false }; io.to(r.code).emit('poll', publicPoll(r.poll)); });
    on('poll-vote', d => { const { r, p } = context(); if (!r.poll || r.poll.closed || !Number.isInteger(d.choice) || !r.poll.choices[d.choice]) throw new Error('Poll is unavailable.'); r.poll.votes.set(p.sessionId, d.choice); io.to(r.code).emit('poll', publicPoll(r.poll)); });
    on('poll-close', () => { const { r } = context(true); if (r.poll) { r.poll.closed = true; io.to(r.code).emit('poll', publicPoll(r.poll)); } });
    function leave(s = socket) { if (!s) return; const r = rooms.get(s.data.code); if (!r) return; const row = r.attendance.findLast(a => a.id === s.id && !a.leftAt); if (row) row.leftAt = Date.now(); r.members.delete(s.id); const waiting = r.waiting.get(s.id); if (waiting) r.sessions.delete(waiting.sessionId); r.waiting.delete(s.id); s.leave(r.code); s.data = {}; if (!r.members.size) r.emptySince = Date.now(); emitState(r); }
    on('leave', () => leave());
    socket.on('disconnect', () => leave());
    socket.on('error', () => {});
  });
  app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url))));
  app.get('/{*path}', (req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'Not found' }) : res.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url))));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.status === 400 ? 'Invalid request.' : 'Request failed.' }));
  return { app, server, io, rooms, close: () => { clearInterval(cleanup); io.close(); } };
}
function publicPoll(p) { return p ? { question: p.question, choices: p.choices, counts: p.choices.map((_, i) => [...p.votes.values()].filter(v => v === i).length), total: p.votes.size, closed: p.closed } : null; }
