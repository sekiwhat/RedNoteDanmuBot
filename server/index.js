import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { DanmuBot } from './bot.js';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

// ─── Static file serving ───────────────────────────────────────────────────────
// Try multiple possible client dist paths (dev / production / CI)
const possibleDistPaths = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist'),
];

let clientDist = null;
for (const p of possibleDistPaths) {
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    clientDist = p;
    break;
  }
}

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.json({
      status: 'server running',
      message: 'Frontend not built yet. Run: cd client && npm install && npx vite build',
    });
  });
}

// ─── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
const bot = new DanmuBot();

wss.on('connection', (ws) => {
  // ── Bind bot callbacks to forward events to this client ──
  bot.onLog = (logEntry) => {
    try {
      ws.send(JSON.stringify({ type: 'log', ...logEntry }));
    } catch {
      // client may have disconnected; ignore
    }
  };

  bot.onError = (msg) => {
    try {
      ws.send(JSON.stringify({ type: 'error', message: msg }));
    } catch {
      // ignore
    }
  };

  bot.onCount = (count) => {
    try {
      ws.send(JSON.stringify({ type: 'count', sent: count }));
    } catch {
      // ignore
    }
  };

  // ── Send initial status ──
  ws.send(JSON.stringify({ type: 'status', state: 'disconnected', sentCount: 0 }));

  // ── Handle incoming messages ──
  ws.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: `Invalid JSON: ${err.message}` }));
      return;
    }

    try {
      switch (parsed.type) {
        case 'connect': {
          const url = parsed.url;
          if (!url) {
            ws.send(JSON.stringify({ type: 'error', message: 'Missing url in connect message' }));
            return;
          }
          bot.connect(url)
            .then(() => {
              ws.send(JSON.stringify({ type: 'status', state: 'connected', sentCount: bot.sentCount }));
            })
            .catch((err) => {
              ws.send(JSON.stringify({ type: 'error', message: err.message }));
            });
          break;
        }

        case 'disconnect': {
          bot.disconnect()
            .then(() => {
              ws.send(JSON.stringify({ type: 'status', state: 'disconnected', sentCount: 0 }));
            })
            .catch((err) => {
              ws.send(JSON.stringify({ type: 'error', message: err.message }));
            });
          break;
        }

        case 'start': {
          const prefix = parsed.prefix || '';
          const options = parsed.options || {};
          bot.start(prefix, options)
            .then(() => {
              // After start loop finishes naturally → idle
              ws.send(JSON.stringify({ type: 'status', state: 'idle', sentCount: bot.sentCount }));
            })
            .catch((err) => {
              ws.send(JSON.stringify({ type: 'error', message: err.message }));
            });
          // Immediately report running
          ws.send(JSON.stringify({ type: 'status', state: 'running', sentCount: bot.sentCount }));
          break;
        }

        case 'stop': {
          bot.stop();
          ws.send(JSON.stringify({ type: 'status', state: 'idle', sentCount: bot.sentCount }));
          break;
        }

        case 'getStatus': {
          let state = 'disconnected';
          if (bot.page) state = 'connected';
          if (bot.running) state = 'running';
          ws.send(JSON.stringify({ type: 'status', state, sentCount: bot.sentCount }));
          break;
        }

        default: {
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${parsed.type}` }));
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  // ── On close: just log, don't stop the bot (global singleton) ──
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
server.listen(config.port, () => {
  console.log(`Danmu Bot server running on http://localhost:${config.port}`);
  if (clientDist) {
    console.log(`Serving static files from ${clientDist}`);
  } else {
    console.log('No client dist found — serving API-only (no frontend)');
  }
});
