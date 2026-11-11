/*!
 * MATHORIA 2.0 – quiz-widget.js
 * Khung "Thử thách" dùng chung cho cả 5 đảo. Mỗi đảo chỉ cần:
 *
 *   <div id="quizMount"></div>
 *   <script src="data/questions-bundle.js"></script>
 *   <script src="js/quiz-engine.js"></script>
 *   <script src="js/quiz-widget.js"></script>
 *   <script>
 *     MathoriaQuizWidget.mount({
 *       container: '#quizMount',
 *       land: 'mean',                         // mean | variation | chart | ocean | castle
 *       alreadyEarned: function () {...},     // true nếu đã có pha lê (tuỳ chọn)
 *       onPass: function () {...},            // gọi khi đúng đủ -> trao pha lê bằng code SẴN CÓ của đảo
 *       theme: { accent: 'var(--purple)', ... }
 *     });
 *   </script>
 *
 * Tuỳ chọn khác: passScore (mặc định 3), onAnswer(i, dung, q), onRoundStart(),
 *   passMessage (HTML), mapHref, mapLabel.
 */
(function (root) {
  'use strict';

  var DEFAULT_THEME = {
    text: '#f1eeff', muted: '#b3aad6', card: '#1b1436', line: '#4b3d7c',
    accent: '#9870ff', accent2: '#6568f4', onAccent: '#ffffff',
    ok: '#34d399', bad: '#fb7185', gold: '#fbbf24'
  };

  var CSS = [
    '.mq{color:var(--mq-text);font-family:inherit;line-height:1.55}',
    '.mq *{box-sizing:border-box}',
    '.mq p{margin:0 0 10px;color:var(--mq-muted)}',
    '.mq b{color:var(--mq-text)}',
    '.mq-center{text-align:center;padding:6px 0}',
    '.mq-big{font-size:2.6rem;line-height:1.1;margin:4px 0 8px}',
    '.mq-btn{display:inline-block;border:0;border-radius:12px;padding:11px 20px;margin:6px 4px 0;font:inherit;font-weight:800;cursor:pointer;text-decoration:none;',
      'background:linear-gradient(135deg,var(--mq-accent),var(--mq-accent2));color:var(--mq-onAccent)}',
    '.mq-btn:hover{filter:brightness(1.12)}',
    '.mq-btn.ghost{background:transparent;color:var(--mq-text);border:1px solid var(--mq-line)}',
    '.mq :focus-visible{outline:3px solid var(--mq-gold);outline-offset:3px}',
    '.mq-earned{display:inline-block;margin:0 0 10px;padding:6px 14px;border-radius:99px;border:1px solid var(--mq-gold);color:var(--mq-gold);font-weight:800;font-size:.9rem}',
    '.mq-bar{display:flex;gap:6px;margin:0 0 14px}',
    '.mq-bar i{flex:1;height:6px;border-radius:6px;background:var(--mq-line)}',
    '.mq-bar i.done{background:var(--mq-accent)}.mq-bar i.cur{background:var(--mq-gold)}',
    '.mq-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}',
    '.mq-chip{font-size:.78rem;font-weight:800;padding:3px 11px;border-radius:99px;border:1px solid var(--mq-line);color:var(--mq-muted)}',
    '.mq-chip[data-lv=recognition]{color:#34d399;border-color:#34d39966}',
    '.mq-chip[data-lv=comprehension]{color:#fbbf24;border-color:#fbbf2466}',
    '.mq-chip[data-lv=application]{color:#f472b6;border-color:#f472b666}',
    '.mq-q{font-size:1.08rem;font-weight:700;margin:6px 0 12px;color:var(--mq-text)}',
    '.mq-opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;margin:8px 0;padding:12px 14px;border-radius:12px;',
      'border:1px solid var(--mq-line);background:var(--mq-card);color:var(--mq-text);font:inherit;cursor:pointer;transition:border-color .15s,transform .15s}',
    '.mq-opt:hover:not(:disabled){border-color:var(--mq-accent);transform:translateX(3px)}',
    '.mq-opt b{color:var(--mq-accent);min-width:1.4em}',
    '.mq-opt:disabled{cursor:default}',
    '.mq-opt.ok{border-color:var(--mq-ok);background:rgba(52,211,153,.14)}',
    '.mq-opt.bad{border-color:var(--mq-bad);background:rgba(251,113,133,.14)}',
    '.mq-fb{margin-top:10px;padding:11px 14px;border-radius:10px;border-left:4px solid var(--mq-accent);background:rgba(255,255,255,.05);font-size:.93rem}',
    '.mq-fb.ok{border-left-color:var(--mq-ok)}.mq-fb.bad{border-left-color:var(--mq-bad)}',
    '.mq-fb strong{display:block;margin-bottom:2px}',
    '.mq-fb.ok strong{color:var(--mq-ok)}.mq-fb.bad strong{color:var(--mq-bad)}',
    '.mq-res{margin-top:14px;padding:14px 16px;border-radius:14px;border:1px solid var(--mq-line)}',
    '.mq-res.win{border-color:var(--mq-ok);background:rgba(52,211,153,.1)}',
    '.mq-res.lose{border-color:var(--mq-bad);background:rgba(251,113,133,.08)}',
    '.mq-res h3{margin:0 0 6px;font-size:1.2rem;color:var(--mq-text)}',
    '.mq-row{display:flex;gap:10px;text-align:left;padding:9px 0;border-top:1px solid var(--mq-line);font-size:.9rem;color:var(--mq-muted)}',
    '.mq-row:first-of-type{border-top:0}',
    '.mq-row em{display:block;font-style:normal;color:var(--mq-text);font-weight:700}',
    '@media (prefers-reduced-motion:no-preference){.mq-gem{animation:mqpop .7s ease}@keyframes mqpop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}}'
  ].join('');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectCss() {
    if (document.getElementById('mq-style')) return;
    var st = document.createElement('style');
    st.id = 'mq-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function mount(opt) {
    var host = typeof opt.container === 'string' ? document.querySelector(opt.container) : opt.container;
    if (!host) return null;
    if (!root.MathoriaQuiz) { host.textContent = 'Thiếu quiz-engine.js: hãy thêm <script src="js/quiz-engine.js">.'; return null; }
    var Quiz = root.MathoriaQuiz;

    injectCss();
    host.classList.add('mq');
    var th = opt.theme || {};
    Object.keys(DEFAULT_THEME).forEach(function (k) {
      host.style.setProperty('--mq-' + k, th[k] || DEFAULT_THEME[k]);
    });

    var land = opt.land;
    var passScore = typeof opt.passScore === 'number' ? opt.passScore : 3;
    var mapHref = opt.mapHref || 'index.html#world';
    var mapLabel = opt.mapLabel || '← Quay lại bản đồ';
    var state = 'loading', round = [], idx = 0, answers = [], locked = false;

    function earned() { try { return !!(opt.alreadyEarned && opt.alreadyEarned()); } catch (e) { return false; } }

    // ---------------------------------------------------------------- màn hình
    function renderIntro() {
      state = 'intro';
      var s = Quiz.stats(land), got = earned();
      host.innerHTML =
        '<div class="mq-center"><div class="mq-big" aria-hidden="true">🗝️</div>' +
        (got ? '<div class="mq-earned">💎 Bạn đã nhận pha lê của vùng đất này</div>' : '') +
        '<p>Mỗi lượt gồm <b>3 câu</b> rút ngẫu nhiên từ ngân hàng <b>' + s.total + ' câu</b> của vùng đất: ' +
        '1 Nhận biết · 1 Thông hiểu · 1 Vận dụng.<br>' +
        (got ? 'Bạn có thể luyện tập thêm với những câu hỏi mới.' : 'Cần đúng <b>' + passScore + '/3</b> câu để nhận pha lê.') + '</p>' +
        '<button class="mq-btn" data-act="start">' + (got ? 'Luyện tập lượt mới' : 'Bắt đầu thử thách') + '</button></div>';
      host.querySelector('[data-act=start]').onclick = startRound;
    }

    function startRound() {
      round = Quiz.drawRound(land); idx = 0; answers = []; locked = false;
      if (opt.onRoundStart) { try { opt.onRoundStart(); } catch (e) {} }
      renderQuestion();
    }

    function renderQuestion() {
      state = 'question'; locked = false;
      var q = round[idx];
      var bar = round.map(function (_, i) { return '<i class="' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '"></i>'; }).join('');
      var opts = q.options.map(function (o, i) {
        return '<button type="button" class="mq-opt" data-i="' + i + '"><b>' + 'ABCD'.charAt(i) + '.</b><span>' + esc(o) + '</span></button>';
      }).join('');
      host.innerHTML =
        '<div class="mq-bar" aria-hidden="true">' + bar + '</div>' +
        '<div class="mq-chips"><span class="mq-chip" data-lv="' + q.level + '">' + esc(q.levelLabel) + '</span><span class="mq-chip">' + esc(q.topic) + '</span></div>' +
        '<div class="mq-q">Câu ' + (idx + 1) + '/' + round.length + '. ' + esc(q.question) + '</div>' +
        '<div role="group" aria-label="Các đáp án">' + opts + '</div>' +
        '<div aria-live="polite" id="mq-live"></div>';
      Array.prototype.forEach.call(host.querySelectorAll('.mq-opt'), function (b) {
        b.onclick = function () { pick(+b.getAttribute('data-i')); };
      });
    }

    function pick(i) {
      if (locked || state !== 'question') return;
      locked = true;
      var q = round[idx]; answers[idx] = i;
      var good = Quiz.check(q, i);
      Array.prototype.forEach.call(host.querySelectorAll('.mq-opt'), function (b, k) {
        b.disabled = true;
        if (k === q.answerIndex) b.classList.add('ok');
        else if (k === i) b.classList.add('bad');
      });
      var last = idx === round.length - 1;
      host.querySelector('#mq-live').innerHTML =
        '<div class="mq-fb ' + (good ? 'ok' : 'bad') + '"><strong>' + (good ? '✅ Chính xác!' : '❌ Chưa đúng.') + '</strong>' +
        (good ? '' : 'Đáp án đúng: <b>' + esc(q.answer) + '</b>. ') + esc(q.explanation) + '</div>' +
        '<button type="button" class="mq-btn" id="mq-next">' + (last ? 'Xem kết quả' : 'Câu tiếp theo →') + '</button>';
      if (opt.onAnswer) { try { opt.onAnswer(idx, good, q); } catch (e) {} }
      var nx = host.querySelector('#mq-next');
      nx.onclick = function () { if (last) renderResult(); else { idx++; renderQuestion(); } };
      nx.focus();
    }

    function renderResult() {
      state = 'result';
      var res = Quiz.gradeRound(round, answers, passScore);
      if (res.passed && opt.onPass) { try { opt.onPass(res); } catch (e) {} }
      var rows = res.details.map(function (d, i) {
        return '<div class="mq-row"><span aria-hidden="true">' + (d.correct ? '✅' : '❌') + '</span><span><em>' + esc(d.levelLabel) + ': ' + esc(round[i].question) + '</em>' +
          (d.correct ? '' : 'Đáp án đúng: ' + esc(d.correctText) + '. ') + esc(d.explanation) + '</span></div>';
      }).join('');
      var msg = opt.passMessage || 'Bạn nhận được pha lê của vùng đất này.';
      host.innerHTML =
        '<div class="mq-res ' + (res.passed ? 'win' : 'lose') + '"><div class="mq-center">' +
        (res.passed ? '<div class="mq-big mq-gem" aria-hidden="true">💎</div><h3>Bạn đúng ' + res.correct + '/' + res.total + ' câu!</h3><p>' + msg + '</p>'
                    : '<div class="mq-big" aria-hidden="true">🔁</div><h3>Bạn đúng ' + res.correct + '/' + res.total + ' câu.</h3><p>Cần đúng ít nhất ' + passScore + ' câu. Xem lời giải bên dưới rồi thử lại với bộ câu hỏi mới nhé!</p>') +
        '</div>' + rows + '<div class="mq-center">' +
        (res.passed ? '<a class="mq-btn" href="' + esc(mapHref) + '">' + esc(mapLabel) + '</a><button type="button" class="mq-btn ghost" data-act="again">Luyện tập lượt mới</button>'
                    : '<button type="button" class="mq-btn" data-act="again">Thử lại với câu hỏi mới</button>') +
        '</div></div>';
      host.querySelector('[data-act=again]').onclick = startRound;
      if (host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Phím tắt A–D hoặc 1–4 khi đang làm bài
    document.addEventListener('keydown', function (e) {
      if (state !== 'question' || locked || host.offsetParent === null) return;
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase(), n = 'abcd'.indexOf(k);
      if (n < 0 && k >= '1' && k <= '4') n = +k - 1;
      if (n >= 0 && n < round[idx].options.length) pick(n);
    });

    // ---------------------------------------------------------------- khởi động
    host.innerHTML = '<p class="mq-center">Đang tải ngân hàng câu hỏi…</p>';
    Quiz.loadLand(land).then(renderIntro).catch(function (err) {
      host.innerHTML = '<p class="mq-center" style="color:var(--mq-bad)">Không tải được câu hỏi: ' + esc(err.message) +
        '<br>Hãy kiểm tra thư mục <b>data/</b> và các thẻ &lt;script&gt; đã thêm.</p>';
    });

    return { restart: startRound };
  }

  root.MathoriaQuizWidget = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
