'use strict';
// Endpoint: POST /api/ai/chat  và  GET /api/ai/health
// Kiểm tra payload, giới hạn tần suất (rate-limit) rồi chuyển cho ai-service.

const service = require('../services/ai-service');

const MAX_BODY = 24 * 1024;      // 24 KB
const MAX_MESSAGE = 600;
const MAX_HISTORY = 8;
const MAX_HISTORY_ITEM = 1500;

const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN) || 12; // số câu hỏi / phút / IP
const WINDOW_MS = 60 * 1000;
const hits = new Map(); // ip -> [timestamp]

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, list] of hits) {
    const fresh = list.filter(t => t > cutoff);
    if (fresh.length) hits.set(ip, fresh); else hits.delete(ip);
  }
}, WINDOW_MS).unref();

function rateLimit(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => t > now - WINDOW_MS);
  if (list.length >= LIMIT) {
    hits.set(ip, list);
    return Math.max(1, Math.ceil((list[0] + WINDOW_MS - now) / 1000));
  }
  list.push(now);
  hits.set(ip, list);
  return 0;
}

function send(res, status, obj, headers) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, tooBig = false; const chunks = [];
    req.on('data', c => {
      if (tooBig) return; // bỏ phần dữ liệu thừa nhưng vẫn đọc hết để trả được mã 413
      size += c.length;
      if (size > MAX_BODY) { tooBig = true; chunks.length = 0; return; }
      chunks.push(c);
    });
    req.on('end', () => tooBig ? reject(Object.assign(new Error('too large'), { status: 413 })) : resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function str(v, max) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '';
}

// Chuẩn hóa dữ liệu client gửi lên: chỉ giữ trường hợp lệ, cắt độ dài, bỏ vai trò lạ.
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const message = str(raw.message, MAX_MESSAGE);
  if (!message) return null;
  const mode = raw.mode === 'lesson' ? 'lesson' : 'general';
  const landId = mode === 'lesson' && typeof raw.landId === 'string' && service.LANDS[raw.landId] ? raw.landId : null;
  const intent = typeof raw.intent === 'string' && raw.intent in service.INTENTS ? raw.intent : 'ask';
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: str(m.content, MAX_HISTORY_ITEM) }))
    .filter(m => m.content);
  const ctx = raw.context && typeof raw.context === 'object' ? raw.context : {};
  const q = ctx.activeQuestion && typeof ctx.activeQuestion === 'object' ? ctx.activeQuestion : null;
  const lab = ctx.lab && typeof ctx.lab === 'object' ? ctx.lab : null;
  return {
    message, mode, landId, intent, history,
    context: {
      activeQuestion: q ? { question: str(q.question, 400), options: Array.isArray(q.options) ? q.options.slice(0, 6).map(o => str(o, 120)) : [] } : null,
      lab: lab ? { dataset: str(lab.dataset, 200), mean: str(lab.mean, 40), median: str(lab.median, 40), mode: str(lab.mode, 40), range: str(lab.range, 40) } : null
    }
  };
}

async function handle(req, res, pathname) {
  if (pathname === '/api/ai/health' && req.method === 'GET') {
    return send(res, 200, Object.assign({ ok: true, ai: service.status().provider }, { model: service.status().model }));
  }
  if (pathname !== '/api/ai/chat') return false;
  if (req.method !== 'POST') return send(res, 405, { error: 'Chỉ hỗ trợ POST.' }, { Allow: 'POST' });

  const ip = req.socket.remoteAddress || 'unknown';
  const wait = rateLimit(ip);
  if (wait) return send(res, 429, { error: 'Bạn hỏi hơi nhanh, hãy đợi một chút nhé.' }, { 'Retry-After': String(wait) });

  let payload;
  try { payload = normalize(JSON.parse(await readBody(req))); }
  catch (err) {
    if (err.status === 413) return send(res, 413, { error: 'Tin nhắn quá dài.' });
    return send(res, 400, { error: 'Dữ liệu không hợp lệ.' });
  }
  if (!payload) return send(res, 400, { error: 'Bạn chưa nhập câu hỏi.' });

  try {
    send(res, 200, await service.ask(payload));
  } catch (err) {
    if (err instanceof service.AIServiceError) return send(res, err.status, { error: err.publicMessage });
    console.error('[ai] lỗi không mong đợi:', err);
    send(res, 500, { error: 'Máy chủ gặp lỗi. Bạn thử lại sau nhé.' });
  }
}

module.exports = { handle, normalize };
