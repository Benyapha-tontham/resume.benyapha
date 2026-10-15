const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const OFFLINE_AFTER_MS = Number(process.env.ROOM_OFFLINE_AFTER_MS || 45000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rooms.json');
const INITIAL_ROOMS = [
  { id: 'room-101', name: 'Room 101' },
  { id: 'room-102', name: 'Room 102' },
  { id: 'room-201', name: 'Room 201' },
  { id: 'room-202', name: 'Room 202' }
];
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_ROOMS.map(room => ({
    ...room,
    status: 'unknown',
    updatedAt: null
  })), null, 2));
}

function readRooms() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveRooms(rooms) {
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(rooms, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > 8192) {
        reject(new Error('Request body exceeds 8 KB'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    request.on('error', reject);
  });
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return sendJson(response, 200, { ok: true });
  }

  if (url.pathname === '/api/rooms' && request.method === 'GET') {
    return sendJson(response, 200, {
      rooms: readRooms(),
      serverTime: new Date().toISOString(),
      offlineAfterMs: OFFLINE_AFTER_MS
    });
  }

  const roomMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)$/);
  if (roomMatch && request.method === 'POST') {
    let body;
    try {
      body = await readJsonBody(request);
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }

    if (!body || !['available', 'occupied'].includes(body.status)) {
      return sendJson(response, 400, { error: 'status must be "available" or "occupied"' });
    }

    const rooms = readRooms();
    const room = rooms.find(candidate => candidate.id === roomMatch[1]);
    if (!room) {
      return sendJson(response, 404, { error: 'Unknown room id' });
    }

    room.status = body.status;
    room.updatedAt = new Date().toISOString();
    saveRooms(rooms);
    return sendJson(response, 200, { ok: true, room });
  }

  if (url.pathname.startsWith('/api/')) {
    return sendJson(response, 404, { error: 'API route not found' });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  const requestedPath = url.pathname === '/' ? '/index.html'
    : url.pathname === '/rooms' || url.pathname === '/rooms/' ? '/room-dashboard.html'
      : decodeURIComponent(url.pathname);
  const filePath = path.resolve(__dirname, `.${requestedPath}`);
  if (!filePath.startsWith(`${__dirname}${path.sep}`)) {
    return sendJson(response, 403, { error: 'Forbidden' });
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch(error => {
    console.error('Request failed:', error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'Internal server error' });
    } else {
      response.destroy();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Room dashboard available at http://localhost:${PORT}`);
  console.log(`Listening on ${HOST}:${PORT}; offline after ${OFFLINE_AFTER_MS} ms without updates`);
});
