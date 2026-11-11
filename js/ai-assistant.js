// MATHORIA AI – giao diện trợ lý (popup chat) và việc gửi câu hỏi tới backend.
// Tự chèn CSS + HTML nên mỗi trang chỉ cần 2 thẻ <script> (ai-context.js, ai-assistant.js).
// Cấu hình tùy chọn (đặt TRƯỚC thẻ script): window.MATHORIA_AI = { endpoint: "https://.../api/ai/chat" }
(function (root) {
  'use strict';
  var Ctx = root.MathoriaAIContext;
  if (!Ctx || !document.body) return;

  var cfg = root.MATHORIA_AI || {};
  var HISTORY_KEY = 'mathoria-ai-history';
  var MAX_STORED = 30;      // số tin nhắn lưu lại cho mỗi cuộc trò chuyện
  var MAX_SENT = 8;         // số tin nhắn gần nhất gửi kèm làm ngữ cảnh
  var MAX_INPUT = 600;
  var TIMEOUT_MS = 30000;

  function defaultEndpoint() {
    var l = location;
    if (l.protocol === 'file:') return 'http://localhost:3000/api/ai/chat';
    if ((l.hostname === 'localhost' || l.hostname === '127.0.0.1') && l.port !== '3000') {
      return 'http://localhost:3000/api/ai/chat'; // Live Server (5500...) -> backend Node
    }
    return '/api/ai/chat';
  }
  var ENDPOINT = cfg.endpoint || defaultEndpoint();

  // ------------------------------------------------------------------ trạng thái
  var page = Ctx.get();
  var landId = page.landId;
  var mode = landId ? 'lesson' : 'general';
  var busy = false, offline = false, cooldownUntil = 0;
  var store = loadStore();

  function loadStore() {
    try { var s = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; }
    catch (e) { return {}; }
  }
  function saveStore() { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(store)); } catch (e) {} }
  function threadKey() { return mode === 'lesson' ? (landId || 'lab') : 'general'; }
  function thread() { var k = threadKey(); if (!Array.isArray(store[k])) store[k] = []; return store[k]; }

  // ------------------------------------------------------------------ CSS
  var CSS = [
    '.mai{--bg:#120e2b;--panel:#1d1743;--ink:#f7f4ff;--muted:#b4aed0;--purple:#a78bfa;--cyan:#67e7e2;--gold:#ffd778;--line:rgba(255,255,255,.12);font-family:Nunito,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);text-align:left;line-height:1.5;letter-spacing:normal;text-transform:none}',
    '.mai *{box-sizing:border-box}',
    '.mai button,.mai textarea{margin:0;min-width:0;letter-spacing:normal;text-transform:none;font-family:inherit}',
    '.mai-fab{position:fixed;right:22px;bottom:22px;z-index:9998;width:70px;height:70px;border:0;border-radius:50%;padding:0;cursor:pointer;background:radial-gradient(circle at 30% 25%,#7c5cff,#2f2285);box-shadow:0 12px 32px rgba(124,92,255,.55),0 0 0 3px rgba(255,255,255,.14);transition:transform .2s}',
    '.mai-fab:hover{transform:translateY(-3px) scale(1.05)}',
    '.mai-fab:focus-visible,.mai button:focus-visible,.mai textarea:focus-visible{outline:3px solid var(--cyan);outline-offset:2px}',
    '.mai-fab svg{width:48px;height:48px;display:block;margin:auto}',
    '.mai-fab .mai-bubble{position:absolute;right:80px;top:50%;transform:translateY(-50%);white-space:nowrap;background:#fff;color:#2a1f5e;font-weight:800;font-size:.9rem;padding:8px 14px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.25);pointer-events:none}',
    '.mai-fab .mai-bubble:after{content:"";position:absolute;right:-6px;top:50%;margin-top:-6px;border:6px solid transparent;border-left-color:#fff;border-right:0}',
    '.mai.open .mai-fab .mai-bubble{display:none}',
    '.mai-panel{position:fixed;right:22px;bottom:104px;z-index:9999;width:480px;max-width:calc(100vw - 24px);height:min(740px,calc(100vh - 128px));display:none;flex-direction:column;background:var(--bg);border:1px solid rgba(167,139,250,.35);border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.4);overflow:hidden}',
    '.mai.open .mai-panel{display:flex}',
    '.mai.wide .mai-panel{width:min(820px,calc(100vw - 44px));height:calc(100vh - 128px)}',
    '.mai-head{flex:none;padding:14px 16px 12px;background:linear-gradient(135deg,#43309f,#211a52 70%);border-bottom:1px solid var(--line)}',
    '.mai-head-top{display:flex;align-items:center;gap:12px}',
    '.mai-avatar{width:46px;height:46px;flex:none;border-radius:14px;background:rgba(255,255,255,.14);display:grid;place-items:center}',
    '.mai-avatar svg{width:34px;height:34px}',
    '.mai-title{flex:1;min-width:0;line-height:1.2}',
    '.mai-title b{display:block;font-size:1.3rem;font-weight:900;letter-spacing:.14em}',
    '.mai-title small{display:block;color:#cfc8ee;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}',
    '.mai .mai-icon-btn{width:36px;height:36px;padding:0;flex:none;border:0;border-radius:11px;background:rgba(255,255,255,.12);color:var(--ink);cursor:pointer;font-size:1.05rem}',
    '.mai-icon-btn:hover{background:rgba(255,255,255,.24)}',
    '.mai-switch{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:12px;padding:4px;border-radius:14px;background:rgba(0,0,0,.3)}',
    '.mai-switch button{border:0;border-radius:10px;padding:9px 8px;font-weight:800;font-size:.92rem;line-height:1.1;color:var(--muted);background:transparent;cursor:pointer}',
    '.mai-switch button[aria-pressed=true]{background:var(--purple);color:#1a1240}',
    '.mai-log{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:18px 14px 18px 18px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth;overscroll-behavior:contain;background:radial-gradient(500px 220px at 50% 0,rgba(124,92,255,.12),transparent)}',
    '.mai-log,.mai-form textarea{scrollbar-width:thin;scrollbar-color:rgba(167,139,250,.45) transparent}',
    '.mai-log::-webkit-scrollbar,.mai-form textarea::-webkit-scrollbar{width:6px}',
    '.mai-log::-webkit-scrollbar-track,.mai-form textarea::-webkit-scrollbar-track{background:transparent}',
    '.mai-log::-webkit-scrollbar-thumb,.mai-form textarea::-webkit-scrollbar-thumb{background:rgba(167,139,250,.4);border-radius:99px}',
    '.mai-msg{flex:none;max-width:92%;padding:13px 16px;border-radius:18px;font-size:1.04rem;line-height:1.65;overflow-wrap:anywhere;word-wrap:break-word}',
    '.mai-msg p{margin:0 0 9px}.mai-msg p:last-child{margin:0}',
    '.mai-msg ul,.mai-msg ol{margin:6px 0 9px;padding-left:22px}.mai-msg li{margin:3px 0}',
    '.mai-msg strong{color:#fff;font-weight:800}',
    '.mai-msg code{background:rgba(0,0,0,.35);padding:2px 6px;border-radius:6px;font-size:.92em}',
    '.mai-msg.bot{align-self:flex-start;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--purple);border-bottom-left-radius:6px}',
    '.mai-msg.user{align-self:flex-end;max-width:86%;background:linear-gradient(135deg,#7c5cff,#5841d4);border-bottom-right-radius:6px;white-space:pre-wrap;font-weight:600;box-shadow:0 6px 18px rgba(88,65,212,.35)}',
    '.mai-msg.err{align-self:flex-start;background:rgba(251,113,133,.13);border:1px solid rgba(251,113,133,.55)}',
    '.mai-msg .mai-retry{margin-top:10px;border:0;border-radius:10px;padding:8px 14px;background:var(--gold);color:#3a2a00;font-weight:800;font-size:.92rem;cursor:pointer}',
    '.mai-tag{flex:none;align-self:flex-start;max-width:92%;font-size:.8rem;color:var(--gold);margin:-8px 0 0 6px}',
    '.mai-typing{display:inline-flex;gap:5px;padding:6px 2px}',
    '.mai-typing i{width:9px;height:9px;border-radius:50%;background:var(--muted);animation:maib 1.1s infinite ease-in-out}',
    '.mai-typing i:nth-child(2){animation-delay:.15s}.mai-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes maib{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}',
    '.mai button:disabled{opacity:.5;cursor:not-allowed}',
    '.mai-form{flex:none;display:flex;gap:10px;align-items:flex-end;padding:12px 14px 8px;border-top:1px solid var(--line);background:rgba(0,0,0,.18)}',
    '.mai-form textarea{flex:1;resize:none;max-height:140px;min-height:50px;border-radius:16px;border:1px solid rgba(167,139,250,.35);background:rgba(255,255,255,.08);color:var(--ink);padding:13px 15px;font-weight:600;font-size:1.04rem;line-height:1.4}',
    '.mai-form textarea::placeholder{color:var(--muted)}',
    '.mai-send{flex:none;width:50px;height:50px;border:0;border-radius:16px;background:linear-gradient(135deg,var(--cyan),#4cc3e6);color:#07303a;font-size:1.3rem;font-weight:900;cursor:pointer}',
    '.mai-note{flex:none;padding:0 16px 12px;font-size:.78rem;color:var(--muted);text-align:center}',
    '@media (max-width:560px){.mai-panel,.mai.wide .mai-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0}.mai-fab{right:14px;bottom:14px}.mai.open .mai-fab{display:none}.mai [data-ref=wide]{display:none}}',
    '@media (prefers-reduced-motion:reduce){.mai *{animation:none!important;transition:none!important}.mai-log{scroll-behavior:auto}}'
  ].join('');

  // Nhân vật "ORIONIS": một viên pha lê nhỏ biết cười (tự vẽ bằng SVG).
  var MASCOT = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="maig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b7f7f3"/><stop offset="1" stop-color="#9d8cff"/></linearGradient></defs>' +
    '<path d="M32 4l7 17 18 1.5-13.7 11.8L47.600 52 32 42.500 16.400 52l4.300-17.700L7 22.500 25 21Z" fill="url(#maig)" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="31" r="2.600" fill="#1d1450"/><circle cx="32" cy="31" r="2.600" fill="#1d1450"/><circle cx="40" cy="31" r="2.600" fill="#1d1450"/>' +
    '<path d="M27 38q5 4 10 0" fill="none" stroke="#1d1450" stroke-width="2.400" stroke-linecap="round"/>' +
    '<circle cx="54" cy="10" r="3" fill="#ffd778"/><circle cx="10" cy="54" r="2" fill="#ffd778"/></svg>';

  // ------------------------------------------------------------------ DOM
  var host = document.createElement('div');
  host.className = 'mai';
  host.innerHTML =
    '<button type="button" class="mai-fab" aria-label="Mở trợ lý ORIONIS" aria-expanded="false" aria-controls="mai-panel">' + MASCOT +
      '<span class="mai-bubble">Hỏi ORIONIS nhé! ✨</span></button>' +
    '<section class="mai-panel" id="mai-panel" role="dialog" aria-label="Trợ lý ORIONIS">' +
      '<header class="mai-head"><div class="mai-head-top"><span class="mai-avatar">' + MASCOT + '</span>' +
        '<div class="mai-title"><b>ORIONIS</b><small data-ref="where"></small></div>' +
        '<button type="button" class="mai-icon-btn" data-ref="wide" title="Phóng to / thu nhỏ" aria-label="Phóng to hoặc thu nhỏ khung chat">⤢</button>' +
        '<button type="button" class="mai-icon-btn" data-ref="clear" title="Xóa cuộc trò chuyện" aria-label="Xóa cuộc trò chuyện">🗑</button>' +
        '<button type="button" class="mai-icon-btn" data-ref="close" title="Đóng" aria-label="Đóng trợ lý">✕</button></div>' +
        '<div class="mai-switch" role="group" aria-label="Chế độ trợ lý">' +
          '<button type="button" data-mode="general" aria-pressed="false">🌍 Trợ lý chung</button>' +
          '<button type="button" data-mode="lesson" aria-pressed="false" data-ref="lessonBtn"></button></div></header>' +
      '<div class="mai-log" data-ref="log" role="log" aria-live="polite" aria-label="Cuộc trò chuyện"></div>' +
      '<form class="mai-form" data-ref="form"><textarea data-ref="input" rows="1" maxlength="' + MAX_INPUT + '" placeholder="Hỏi ORIONIS về Toán…" aria-label="Câu hỏi của bạn"></textarea>' +
        '<button type="submit" class="mai-send" data-ref="send" aria-label="Gửi">➤</button></form>' +
      '<div class="mai-note">ORIONIS gợi ý để bạn tự tìm ra đáp án. AI có thể sai, hãy đối chiếu với bài học.</div>' +
    '</section>';

  var style = document.createElement('style');
  style.id = 'mai-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.appendChild(host);

  var $ = {};
  [].forEach.call(host.querySelectorAll('[data-ref]'), function (el) { $[el.getAttribute('data-ref')] = el; });
  var fab = host.querySelector('.mai-fab');
  var modeBtns = host.querySelectorAll('[data-mode]');

  // ------------------------------------------------------------------ hiển thị
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=$|[\s).,;:!?])/g, '$1<em>$2</em>');
  }
  // Markdown rất nhỏ (đoạn, **đậm**, *nghiêng*, `mã`, danh sách). Luôn escape trước nên không chèn được HTML.
  function renderMd(src) {
    var lines = esc(src).split(/\r?\n/), out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; } }
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
    lines.forEach(function (ln) {
      var ul = /^\s*[-•*]\s+(.*)$/.exec(ln), ol = /^\s*\d+[.)]\s+(.*)$/.exec(ln);
      if (ul || ol) {
        flushPara();
        var t = ul ? 'ul' : 'ol';
        if (list !== t) { closeList(); out.push('<' + t + '>'); list = t; }
        out.push('<li>' + inline((ul || ol)[1]) + '</li>');
      } else if (!ln.trim()) { flushPara(); closeList(); }
      else { closeList(); para.push(ln); }
    });
    flushPara(); closeList();
    return out.join('');
  }

  function scrollDown() { $.log.scrollTop = $.log.scrollHeight; }

  function addBubble(role, content, extra) {
    var d = document.createElement('div');
    d.className = 'mai-msg ' + role;
    if (role === 'user') d.textContent = content; else d.innerHTML = renderMd(content);
    if (extra) extra(d);
    $.log.appendChild(d);
    scrollDown();
    return d;
  }

  function welcome() {
    var c = Ctx.get();
    if (mode === 'lesson' && c.land) {
      return 'Chào bạn! Mình là **ORIONIS** 👋 Bạn đang ở **' + c.land.name + '** – nơi ta học về ' + c.land.focus +
        '.\nHãy hỏi mình về: ' + c.land.topics.join(', ') + '. Mình sẽ gợi ý từng bước để bạn tự tìm ra đáp án nhé!';
    }
    if (mode === 'lesson') {
      return 'Chào bạn! Mình là **ORIONIS** 👋 Đây là Phòng thí nghiệm. Hãy nhập một bộ dữ liệu rồi hỏi mình về trung bình, trung vị, mốt… mình sẽ dùng số liệu của bạn để giải thích.';
    }
    return 'Chào bạn! Mình là **ORIONIS** 👋 Bạn có thể hỏi bất kỳ thắc mắc Toán nền tảng nào, ví dụ: "Phương sai là gì?" hoặc "Xác suất thực nghiệm khác lý thuyết thế nào?"';
  }

  function renderThread() {
    $.log.innerHTML = '';
    addBubble('bot', welcome());
    thread().forEach(function (m) {
      addBubble(m.role === 'user' ? 'user' : 'bot', m.content);
      if (m.offline) tag('📴 Trả lời ngoại tuyến');
    });
    scrollDown();
  }
  function tag(txt) {
    var t = document.createElement('div'); t.className = 'mai-tag'; t.textContent = txt; $.log.appendChild(t);
  }

  function renderHeader() {
    var c = Ctx.get();
    var lessonLabel = c.land ? c.land.icon + ' Theo bài học' : '🧪 Phòng thí nghiệm';
    $.lessonBtn.textContent = lessonLabel;
    $.where.textContent = mode === 'lesson'
      ? '📍 ' + (c.land ? c.land.name : 'Phòng thí nghiệm thống kê')
      : '📍 Hỏi đáp Toán tổng quát';
    [].forEach.call(modeBtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
    setBusy(busy);
  }

  function setBusy(v) {
    busy = v;
    $.send.disabled = v;
    host.setAttribute('aria-busy', String(v));
  }

  // ------------------------------------------------------------------ gửi tin
  function payload(message, intent) {
    var c = Ctx.get();
    var hist = thread().filter(function (m) { return !m.offline && !m.error; }).slice(-MAX_SENT)
      .map(function (m) { return { role: m.role, content: m.content }; });
    return {
      mode: mode,
      landId: mode === 'lesson' ? c.landId : null,
      intent: intent || 'ask',
      message: message,
      history: hist,
      context: { activeQuestion: c.activeQuestion, lab: c.lab }
    };
  }

  function fetchReply(body) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    return fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, json: j, retryAfter: r.headers.get('Retry-After') }; });
    }).then(function (x) { clearTimeout(timer); return x; }, function (e) { clearTimeout(timer); throw e; });
  }

  function send(message, intent) {
    message = String(message || '').trim().slice(0, MAX_INPUT);
    if (!message || busy) return;
    if (Date.now() < cooldownUntil) {
      addBubble('err', 'Bạn hỏi hơi nhanh rồi 😅 Đợi vài giây rồi hỏi tiếp nhé.');
      return;
    }
    var key = threadKey(), body = payload(message, intent);
    thread().push({ role: 'user', content: message });
    addBubble('user', message);
    $.input.value = ''; autosize();
    setBusy(true);
    var typing = addBubble('bot', '', function (d) { d.innerHTML = '<span class="mai-typing" aria-label="ORIONIS đang trả lời"><i></i><i></i><i></i></span>'; });

    fetchReply(body).then(function (res) {
      typing.remove();
      if (res.ok && res.json && typeof res.json.reply === 'string') {
        offline = false;
        store[key].push({ role: 'assistant', content: res.json.reply });
        addBubble('bot', res.json.reply);
        if (res.json.mock) tag('🔧 Chế độ demo (server chưa có API key)');
      } else if (res.status === 429) {
        var wait = Math.max(1, parseInt(res.retryAfter, 10) || 10);
        cooldownUntil = Date.now() + wait * 1000;
        showError('Bạn hỏi nhanh quá! Hãy đợi khoảng ' + wait + ' giây rồi thử lại.', message, intent);
      } else {
        showError((res.json && res.json.error) || 'Máy chủ AI đang gặp sự cố. Bạn thử lại sau ít phút nhé.', message, intent);
      }
    }).catch(function () {
      typing.remove();
      // Không kết nối được backend -> trả lời bằng bảng thuật ngữ trong trình duyệt.
      offline = true;
      var txt = Ctx.offlineReply(message, mode, landId);
      store[key].push({ role: 'assistant', content: txt, offline: true });
      addBubble('bot', txt);
      tag('📴 Ngoại tuyến · chạy server để dùng AI đầy đủ');
    }).then(function () {
      store[key] = store[key].slice(-MAX_STORED);
      saveStore(); setBusy(false); $.input.focus();
    });
  }

  function showError(msg, message, intent) {
    addBubble('err', msg, function (d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mai-retry'; b.textContent = '↻ Thử lại';
      b.addEventListener('click', function () {
        d.remove();
        var t = thread(); // bỏ lượt hỏi cũ để không bị trùng khi gửi lại
        if (t.length && t[t.length - 1].role === 'user' && t[t.length - 1].content === message) t.pop();
        renderThread(); send(message, intent);
      });
      d.appendChild(b);
    });
    // Giữ lượt hỏi hiển thị nhưng không đưa lượt lỗi vào lịch sử gửi lên server.
    var t = thread(); if (t.length && t[t.length - 1].role === 'user') t.pop();
  }

  // ------------------------------------------------------------------ điều khiển
  function autosize() { $.input.style.height = 'auto'; $.input.style.height = Math.min($.input.scrollHeight, 96) + 'px'; }

  function setOpen(v) {
    host.classList.toggle('open', v);
    fab.setAttribute('aria-expanded', String(v));
    if (v) { renderHeader(); renderThread(); setTimeout(function () { $.input.focus(); }, 50); }
    else fab.focus();
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m; renderHeader(); renderThread();
  }

  fab.addEventListener('click', function () { setOpen(!host.classList.contains('open')); });
  $.wide.addEventListener('click', function () { host.classList.toggle('wide'); setTimeout(scrollDown, 30); });
  $.close.addEventListener('click', function () { setOpen(false); });
  $.clear.addEventListener('click', function () {
    if (busy) return;
    store[threadKey()] = []; saveStore(); renderThread();
  });
  [].forEach.call(modeBtns, function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  $.form.addEventListener('submit', function (e) { e.preventDefault(); send($.input.value); });
  $.input.addEventListener('input', autosize);
  $.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send($.input.value); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && host.classList.contains('open')) setOpen(false);
  });
  // Không để phím tắt A–D / 1–4 của bài quiz bắt phím khi đang gõ trong khung chat:
  // quiz-widget đã bỏ qua TEXTAREA nên không cần xử lý thêm.

  renderHeader();

  root.MathoriaAI = { open: function () { setOpen(true); }, close: function () { setOpen(false); }, ask: function (t, i) { setOpen(true); send(t, i); } };
})(typeof self !== 'undefined' ? self : this);
