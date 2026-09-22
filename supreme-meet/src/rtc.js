// Each connection pre-negotiates camera/audio and a separate screen/audio pair.
// Lower socket ID creates offers, including ICE restarts, avoiding offer glare.
export class Mesh {
  constructor(socket, iceServers, callbacks) {
    this.socket = socket; this.config = { iceServers }; this.callbacks = callbacks;
    this.peers = new Map(); this.local = null; this.screen = null;
    this.signalHandler = d => this.signal(d).catch(e => callbacks.error(e.message));
    socket.on('signal', this.signalHandler);
  }
  get(id) {
    if (this.peers.has(id)) return this.peers.get(id);
    const pc = new RTCPeerConnection(this.config);
    const slots = ['audio', 'video', 'video', 'audio'].map(kind => pc.addTransceiver(kind, { direction: 'sendrecv' }));
    const peer = { pc, slots, candidates: [], camera: new MediaStream(), screen: new MediaStream(), busy: false, retries: 0 };
    this.peers.set(id, peer);
    pc.onicecandidate = e => { if (e.candidate) this.socket.emit('signal', { to: id, candidate: e.candidate.toJSON() }); };
    pc.ontrack = e => {
      const index = slots.findIndex(t => t === e.transceiver);
      const stream = index >= 2 ? peer.screen : peer.camera;
      stream.addTrack(e.track);
      this.callbacks.stream(id, peer.camera, peer.screen);
      e.track.onunmute = () => this.callbacks.stream(id, peer.camera, peer.screen);
    };
    pc.onconnectionstatechange = () => {
      this.callbacks.connection(id, pc.connectionState);
      if (pc.connectionState === 'failed' && this.socket.id < id && peer.retries++ < 3) this.offer(id, true).catch(e => this.callbacks.error(e.message));
    };
    this.replace(peer).catch(e => this.callbacks.error(e.message));
    return peer;
  }
  async replace(peer) {
    const tracks = [this.local?.getAudioTracks()[0], this.local?.getVideoTracks()[0], this.screen?.getVideoTracks()[0], this.screen?.getAudioTracks()[0]];
    await Promise.all(peer.slots.map((t, i) => t.sender.replaceTrack(tracks[i] || null)));
  }
  async media(local, screen) { this.local = local; this.screen = screen; await Promise.all([...this.peers.values()].map(p => this.replace(p))); }
  async sync(participants) {
    const ids = participants.map(p => p.id).filter(id => id !== this.socket.id);
    for (const id of this.peers.keys()) if (!ids.includes(id)) this.remove(id);
    for (const id of ids) if (!this.peers.has(id)) { this.get(id); if (this.socket.id < id) await this.offer(id); }
  }
  async offer(id, restart = false) {
    const p = this.get(id); if (p.busy || p.pc.signalingState !== 'stable') return;
    p.busy = true;
    try { await this.replace(p); await p.pc.setLocalDescription(await p.pc.createOffer({ iceRestart: restart })); this.socket.emit('signal', { to: id, description: p.pc.localDescription }); } finally { p.busy = false; }
  }
  async signal({ from, description, candidate }) {
    const p = this.get(from);
    if (description) {
      await p.pc.setRemoteDescription(description);
      for (const c of p.candidates.splice(0)) await p.pc.addIceCandidate(c);
      if (description.type === 'offer') { await this.replace(p); await p.pc.setLocalDescription(await p.pc.createAnswer()); this.socket.emit('signal', { to: from, description: p.pc.localDescription }); }
    } else if (candidate) { if (p.pc.remoteDescription) await p.pc.addIceCandidate(candidate); else p.candidates.push(candidate); }
  }
  remove(id) { const p = this.peers.get(id); if (p) { p.pc.onconnectionstatechange = null; p.pc.close(); this.peers.delete(id); this.callbacks.remove(id); } }
  close() { this.socket.off('signal', this.signalHandler); for (const id of this.peers.keys()) this.remove(id); }
}
