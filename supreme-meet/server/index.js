import { createApp } from './app.js';
const { server, close } = createApp();
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ event: 'listening', port, version: '1.0.0' })));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); });
