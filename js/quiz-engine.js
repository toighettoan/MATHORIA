/*!
 * MATHORIA 2.0 – quiz-engine.js
 * ---------------------------------------------------------------------------
 * Nhiệm vụ:
 *   1. Nạp ngân hàng câu hỏi của từng vùng đất (JSON hoặc bundle .js).
 *   2. Rút mỗi lượt đúng 3 câu: 1 Nhận biết + 1 Thông hiểu + 1 Vận dụng,
 *      không trùng nhau trong cùng lượt.
 *   3. Ưu tiên câu CHƯA GẶP (lưu trong localStorage) để các lượt chơi liên tiếp
 *      không lặp lại câu cũ cho đến khi cả mức độ đó được dùng hết.
 *   4. Xáo thứ tự đáp án A/B/C/D và chấm điểm theo NỘI DUNG đáp án.
 *
 * Cách dùng nhanh:
 *   const round = await MathoriaQuiz.startRound('mean');   // 3 câu
 *   const ok    = MathoriaQuiz.check(round[0], 2);         // chọn đáp án thứ 3
 *   const res   = MathoriaQuiz.gradeRound(round, [2, 0, 1]);
 *   if (res.passed) { ...trao pha lê bằng hệ thống pha lê hiện có... }
 *
 * Mã vùng đất: mean | variation | chart | ocean | castle
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.MathoriaQuiz = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  // ------------------------------------------------------------------ cấu hình
  var LEVELS = ['recognition', 'comprehension', 'application'];
  var LEVEL_LABEL = {
    recognition: 'Nhận biết',
    comprehension: 'Thông hiểu',
    application: 'Vận dụng'
  };
  var LAND_FILES = {
    mean: 'data/mean-questions.json',
    variation: 'data/variation-questions.json',
    chart: 'data/chart-questions.json',
    ocean: 'data/ocean-questions.json',
    castle: 'data/castle-questions.json'
  };
  var config = {
    basePath: '',                       // tiền tố đường dẫn tới thư mục chứa data/
    storageKey: 'mathoria_quiz_history_v1',
    passScore: 3                        // số câu đúng tối thiểu để nhận pha lê (đổi tại đây)
  };

  var banks = {};                       // land -> mảng câu hỏi đã nạp
  var memoryHistory = null;             // dự phòng khi localStorage bị chặn

  // ------------------------------------------------------------------ tiện ích
  function randInt(n) {                 // số nguyên ngẫu nhiên trong [0, n)
    var c = root.crypto || (root.msCrypto);
    if (c && c.getRandomValues) {
      var max = 0x100000000, limit = max - (max % n), buf = new Uint32Array(1);
      do { c.getRandomValues(buf); } while (buf[0] >= limit);   // tránh lệch phân phối
      return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  function shuffle(arr) {               // Fisher–Yates, trả về bản sao
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickOne(arr) { return arr[randInt(arr.length)]; }

  // ------------------------------------------------------------------ lịch sử
  function readHistory() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(config.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* bỏ qua */ }
    return memoryHistory || {};
  }

  function writeHistory(h) {
    memoryHistory = h;
    try {
      if (root.localStorage) root.localStorage.setItem(config.storageKey, JSON.stringify(h));
    } catch (e) { /* localStorage bị chặn: dùng bộ nhớ tạm */ }
  }

  function landHistory(h, land) {
    if (!h[land]) h[land] = { seen: {}, last: [] };
    return h[land];
  }

  function resetHistory(land) {
    var h = readHistory();
    if (land) delete h[land]; else h = {};
    writeHistory(h);
  }

  // ------------------------------------------------------------------ kiểm tra dữ liệu
  function validateBank(list, land) {
    var errors = [], ids = {};
    if (!Array.isArray(list)) return ['Ngân hàng "' + land + '" không phải là mảng.'];
    list.forEach(function (q, i) {
      var tag = (q && q.id) || ('#' + (i + 1));
      if (!q || !q.id) errors.push('Câu ' + tag + ': thiếu id');
      else if (ids[q.id]) errors.push('Câu ' + tag + ': id bị trùng');
      else ids[q.id] = true;
      if (LEVELS.indexOf(q.level) < 0) errors.push('Câu ' + tag + ': level không hợp lệ (' + q.level + ')');
      if (!q.question) errors.push('Câu ' + tag + ': thiếu nội dung câu hỏi');
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push('Câu ' + tag + ': cần ít nhất 2 đáp án');
      else {
        if (q.options.indexOf(q.answer) < 0) errors.push('Câu ' + tag + ': đáp án không nằm trong options');
        var uniq = {}; q.options.forEach(function (o) { uniq[o] = 1; });
        if (Object.keys(uniq).length !== q.options.length) errors.push('Câu ' + tag + ': có đáp án trùng nhau');
      }
    });
    LEVELS.forEach(function (lv) {
      if (!list.some(function (q) { return q.level === lv; }))
        errors.push('Ngân hàng "' + land + '" thiếu mức độ ' + LEVEL_LABEL[lv]);
    });
    return errors;
  }

  // ------------------------------------------------------------------ nạp dữ liệu
  function setBank(land, list) {        // dùng cho bundle hoặc kiểm thử
    var errors = validateBank(list, land);
    if (errors.length) throw new Error(errors.join('\n'));
    banks[land] = list;
    return list;
  }

  function loadLand(land) {
    if (banks[land]) return Promise.resolve(banks[land]);
    if (!LAND_FILES[land]) return Promise.reject(new Error('Vùng đất không tồn tại: ' + land));

    // 1) Bundle .js (chạy được cả khi mở file trực tiếp bằng file://)
    var bundle = root.MATHORIA_QUESTIONS && root.MATHORIA_QUESTIONS[land];
    if (bundle) return Promise.resolve(setBank(land, bundle));

    // 2) Tải JSON qua fetch (cần chạy qua máy chủ: Live Server, GitHub Pages, …)
    if (typeof fetch !== 'function') return Promise.reject(new Error('Không thể tải dữ liệu câu hỏi.'));
    return fetch(config.basePath + LAND_FILES[land])
      .then(function (r) {
        if (!r.ok) throw new Error('Không tải được ' + LAND_FILES[land] + ' (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function (list) { return setBank(land, list); });
  }

  // ------------------------------------------------------------------ rút câu hỏi
  function prepare(q) {                 // tạo bản sao đã xáo đáp án, không đụng vào dữ liệu gốc
    var options = shuffle(q.options);
    return {
      id: q.id, land: q.land, topic: q.topic,
      level: q.level, levelLabel: LEVEL_LABEL[q.level],
      type: q.type || 'multiple_choice',
      question: q.question,
      options: options,
      answer: q.answer,
      answerIndex: options.indexOf(q.answer),
      explanation: q.explanation || ''
    };
  }

  /**
   * Rút một lượt thử thách đồng bộ (ngân hàng phải được nạp trước bằng loadLand).
   * Luôn trả về đúng 3 câu theo thứ tự: Nhận biết → Thông hiểu → Vận dụng.
   */
  function drawRound(land) {
    var bank = banks[land];
    if (!bank) throw new Error('Chưa nạp ngân hàng câu hỏi của vùng "' + land + '".');

    var h = readHistory(), lh = landHistory(h, land);
    var round = [], usedNow = {};

    LEVELS.forEach(function (lv) {
      var all = bank.filter(function (q) { return q.level === lv; });
      var seen = lh.seen[lv] || (lh.seen[lv] = []);

      // câu chưa gặp ở mức độ này
      var pool = all.filter(function (q) { return seen.indexOf(q.id) < 0; });

      if (pool.length === 0) {          // đã dùng hết → bắt đầu vòng mới cho mức độ này
        seen = lh.seen[lv] = [];
        pool = all.filter(function (q) { return lh.last.indexOf(q.id) < 0; }); // tránh lặp ngay lượt trước
        if (pool.length === 0) pool = all;
      }

      var q = pickOne(pool);
      usedNow[q.id] = true;
      seen.push(q.id);
      round.push(prepare(q));
    });

    lh.last = Object.keys(usedNow);
    writeHistory(h);
    return round;
  }

  function startRound(land) {
    return loadLand(land).then(function () { return drawRound(land); });
  }

  // ------------------------------------------------------------------ chấm điểm
  function check(question, selectedIndex) {
    return selectedIndex === question.answerIndex;
  }

  function gradeRound(round, selectedIndices, passScore) {
    var need = typeof passScore === 'number' ? passScore : config.passScore;
    var details = round.map(function (q, i) {
      var sel = selectedIndices[i];
      return {
        id: q.id, level: q.level, levelLabel: q.levelLabel,
        selected: sel,
        selectedText: sel >= 0 && sel != null ? q.options[sel] : null,
        correctText: q.answer,
        correct: check(q, sel),
        explanation: q.explanation
      };
    });
    var correct = details.filter(function (d) { return d.correct; }).length;
    return { correct: correct, total: round.length, passScore: need, passed: correct >= need, details: details };
  }

  // ------------------------------------------------------------------ thống kê
  function stats(land) {
    var bank = banks[land] || [];
    var out = { total: bank.length };
    LEVELS.forEach(function (lv) {
      out[lv] = bank.filter(function (q) { return q.level === lv; }).length;
    });
    return out;
  }

  return {
    LEVELS: LEVELS, LEVEL_LABEL: LEVEL_LABEL, LANDS: Object.keys(LAND_FILES),
    config: config,
    loadLand: loadLand, setBank: setBank, validateBank: validateBank,
    drawRound: drawRound, startRound: startRound,
    check: check, gradeRound: gradeRound,
    stats: stats, resetHistory: resetHistory
  };
});
