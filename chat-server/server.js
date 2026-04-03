const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.CHAT_PORT || '3000', 10);
const STALE_SECONDS = parseInt(process.env.STATUS_STALE_SECONDS || '15', 10);
const HLS_PLAYLIST = '/tmp/hls/stream.m3u8';

// --- HTTP server -----------------------------------------------------------

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/status') {
    let live = false;
    try {
      const stat = fs.statSync(HLS_PLAYLIST);
      const ageMs = Date.now() - stat.mtimeMs;
      live = ageMs < STALE_SECONDS * 1000;
    } catch (_) {
      // file doesn't exist → offline
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ live }));
    return;
  }

  res.writeHead(404);
  res.end();
});

// --- WebSocket server -------------------------------------------------------

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return;
    }

    const user = String(msg.user || 'anonymous').slice(0, 32);
    const message = String(msg.message || '').trim().slice(0, 500);
    if (!message) return;

    const payload = JSON.stringify({ user, message, timestamp: Date.now() });

    for (const client of wss.clients) {
      if (client.readyState === ws.OPEN) {
        client.send(payload);
      }
    }
  });
});

// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
  console.log(`Stream status stale threshold: ${STALE_SECONDS}s`);
});
