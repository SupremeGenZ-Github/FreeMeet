import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static('public'));
app.get('/health', (_, res) => res.json({ ok: true }));

const rooms = new Map();
const makeId = () => crypto.randomBytes(4).toString('hex');

io.on('connection', socket => {
  socket.on('join-room', ({ roomId, name }) => {
    roomId = String(roomId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || makeId();
    name = String(name || 'Guest').slice(0, 40);
    const room = rooms.get(roomId) || { host: socket.id, users: new Map(), messages: [] };
    rooms.set(roomId, room);
    const peers = [...room.users.entries()].map(([id,u]) => ({ id, name:u.name, mic:u.mic, cam:u.cam, hand:u.hand }));
    room.users.set(socket.id, { name, mic:true, cam:true, hand:false });
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;
    socket.emit('room-state', { roomId, host: room.host, selfId: socket.id, peers, messages: room.messages.slice(-100) });
    socket.to(roomId).emit('user-joined', { id: socket.id, name, mic:true, cam:true, hand:false });
  });

  socket.on('signal', ({ to, data }) => io.to(to).emit('signal', { from: socket.id, data }));

  socket.on('state', ({ mic, cam, hand }) => {
    const room = rooms.get(socket.data.roomId); if (!room) return;
    const u = room.users.get(socket.id); if (!u) return;
    if (typeof mic === 'boolean') u.mic = mic;
    if (typeof cam === 'boolean') u.cam = cam;
    if (typeof hand === 'boolean') u.hand = hand;
    socket.to(socket.data.roomId).emit('user-state', { id:socket.id, mic:u.mic, cam:u.cam, hand:u.hand });
  });

  socket.on('chat', text => {
    const room = rooms.get(socket.data.roomId); if (!room) return;
    const msg = { id: makeId(), name: socket.data.name || 'Guest', text:String(text||'').slice(0,1000), time:Date.now() };
    room.messages.push(msg); if (room.messages.length > 200) room.messages.shift();
    io.to(socket.data.roomId).emit('chat', msg);
  });

  socket.on('host-action', ({ action, target }) => {
    const room = rooms.get(socket.data.roomId); if (!room || room.host !== socket.id) return;
    io.to(target || socket.data.roomId).emit('host-action', { action, by: socket.id });
  });

  socket.on('reaction', emoji => socket.to(socket.data.roomId).emit('reaction', { id:socket.id, emoji:String(emoji).slice(0,8) }));

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId; const room = rooms.get(roomId); if (!room) return;
    room.users.delete(socket.id); socket.to(roomId).emit('user-left', socket.id);
    if (room.host === socket.id) {
      const next = room.users.keys().next().value;
      room.host = next || null;
      if (next) io.to(next).emit('host', { host:true });
    }
    if (room.users.size === 0) rooms.delete(roomId);
  });
});

const port = process.env.PORT || 10000;
server.listen(port, () => console.log(`MeetFree listening on ${port}`));
