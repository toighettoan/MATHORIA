'use strict';
// Máy chủ MATHORIA: vừa phục vụ website tĩnh, vừa cung cấp /api/ai/*.
// Chỉ dùng thư viện có sẵn của Node.js (>= 18): không cần npm install.
// Chạy:  node server/server.js   rồi mở http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Đọc server/.env (KEY=VALUE) vào process.env; biến môi trường thật được ưu tiên.
function loadEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv(path.join(__dirname, '.env'));

const aiRoute = require('./routes/ai');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

// CORS: cho phép Live Server (localhost:5500...) gọi sang backend; thêm tên miền khác qua ALLOWED_ORIGINS.
const extraOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
function originAllowed(origin) {
  if (!origin) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return extraOrigins.includes(origin);
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, '.' + rel);
  const relToRoot = path.relative(ROOT, file);
  const parts = relToRoot.split(path.sep);
  // Chặn thoát khỏi thư mục dự án, thư mục server/ (chứa .env) và mọi tệp ẩn.
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot) || parts[0] === 'server' || parts.some(p => p.startsWith('.'))) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Không tìm thấy trang.');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Không tìm thấy trang.');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname.startsWith('/api/')) {
    const origin = req.headers.origin;
    if (originAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      const handled = await aiRoute.handle(req, res, pathname);
      if (handled === false) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Không có endpoint này.' }));
      }
    } catch (err) {
      console.error('[server]', err);
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' }); }
      res.end(JSON.stringify({ error: 'Máy chủ gặp lỗi.' }));
    }
    return;
  }
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => {
    const st = require('./services/ai-service').status();
    console.log(st.provider === 'mock'
      ? 'AI: CHẾ ĐỘ DEMO (chưa có OPENAI_API_KEY hoặc GEMINI_API_KEY trong server/.env)'
      : `AI: ${st.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} (model ${st.model}). Máy chủ cần Internet để gọi AI.`);
  });
}

module.exports = server;
