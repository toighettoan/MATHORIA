// MATHORIA AI – ngữ cảnh học tập.
// Nhiệm vụ: (1) nhận biết học sinh đang đứng ở vùng đất nào, (2) cung cấp chủ đề
// và gợi ý cho vùng đó, (3) đọc dữ liệu đang hiện trên trang (thí nghiệm, câu hỏi
// đang làm), (4) trả lời "ngoại tuyến" bằng bảng thuật ngữ khi chưa có máy chủ AI.
// Không chứa API key và không gọi mạng.
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- 5 vùng đất
  // Khóa trùng với js/data.js và với "land" trong data/*.json.
  var LANDS = {
    mean: {
      name: 'Đảo Trung Bình', icon: '🏝️', page: 'dao-trung-binh.html',
      topics: ['Trung bình cộng', 'Trung vị', 'Mốt'],
      focus: 'xu hướng tập trung của dữ liệu'
    },
    variation: {
      name: 'Thung lũng Biến Thiên', icon: '🌿', page: 'thung-lung-bien-thien.html',
      topics: ['Khoảng biến thiên', 'Khoảng tứ phân vị', 'Phương sai', 'Độ lệch chuẩn'],
      focus: 'độ phân tán (biến thiên) của dữ liệu'
    },
    chart: {
      name: 'Rừng Biểu Đồ', icon: '📊', page: 'rung-bieu-do.html',
      topics: ['Bảng tần số', 'Biểu đồ cột', 'Biểu đồ đường', 'Biểu đồ tròn'],
      focus: 'lập bảng tần số và đọc biểu đồ'
    },
    ocean: {
      name: 'Đại Dương Ngẫu Nhiên', icon: '🌊', page: 'dai-duong-ngau-nhien.html',
      topics: ['Phép thử', 'Không gian mẫu', 'Biến cố'],
      focus: 'các kết quả có thể xảy ra và không gian mẫu'
    },
    castle: {
      name: 'Lâu Đài Xác Suất', icon: '🔮', page: 'lau-dai-xac-suat.html',
      topics: ['Xác suất lý thuyết', 'Xác suất thực nghiệm', 'Biến cố đối'],
      focus: 'phân biệt xác suất lý thuyết và kết quả thực tế'
    }
  };

  function detectLand() {
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    try { file = decodeURIComponent(file); } catch (e) {}
    var ids = Object.keys(LANDS);
    for (var i = 0; i < ids.length; i++) {
      if (LANDS[ids[i]].page === file) return ids[i];
    }
    return null; // trang chủ / bản đồ
  }

  // ------------------------------------------------- dữ liệu đang hiện trên trang
  function clip(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) : s; }
  function text(id) { var el = document.getElementById(id); return el ? clip(el.textContent, 80) : ''; }

  // Câu hỏi quiz đang hiển thị mà học sinh CHƯA trả lời. Chỉ lấy đề và các lựa chọn,
  // không có đáp án đúng (trang không đưa đáp án ra DOM trước khi trả lời).
  function activeQuestion() {
    var q = document.querySelector('.mq-q');
    if (!q || document.querySelector('.mq-fb')) return null;
    var opts = [].map.call(document.querySelectorAll('.mq-opt span'), function (s) { return clip(s.textContent, 120); });
    return { question: clip(q.textContent, 400), options: opts.slice(0, 6) };
  }

  // Số liệu trong Phòng thí nghiệm Thống kê (trang chủ).
  function labData() {
    var input = document.getElementById('dataInput');
    if (!input) return null;
    return {
      dataset: clip(input.value, 200),
      mean: text('meanResult'), median: text('medianResult'),
      mode: text('modeResult'), range: text('rangeResult')
    };
  }

  function get() {
    var land = detectLand();
    var ctx = { landId: land, land: land ? LANDS[land] : null, activeQuestion: null, lab: null };
    if (land) ctx.activeQuestion = activeQuestion();
    else ctx.lab = labData();
    return ctx;
  }

  // ---------------------------------------------------------------- nút gợi ý nhanh
  // intent được gửi lên server để chọn cách phản hồi; message là câu hiển thị trong khung chat.
  function quickActions(mode, landId) {
    var land = landId ? LANDS[landId] : null;
    var topic = (mode === 'lesson' && land) ? land.topics.join(' – ') : 'chủ đề mà mình đang học';
    return [
      { intent: 'explain',  label: '💡 Giải thích kiến thức', message: 'Hãy giải thích kiến thức trọng tâm: ' + topic + '.' },
      { intent: 'hint',     label: '🧭 Gợi ý bài tập',        message: 'Mình đang làm bài tập này. Hãy gợi ý hướng giải, đừng đưa đáp án nhé.' },
      { intent: 'example',  label: '🔁 Cho ví dụ khác',       message: 'Cho mình thêm một ví dụ khác, gần gũi với đời sống.' },
      { intent: 'check',    label: '✅ Kiểm tra cách hiểu',   message: 'Hãy hỏi mình một câu ngắn để kiểm tra xem mình đã hiểu chưa.' }
    ];
  }

  // ----------------------------------------- trả lời ngoại tuyến (khi chưa chạy server)
  // Bảng thuật ngữ nhỏ, chỉ nêu định nghĩa – công thức – ví dụ nền tảng, KHÔNG giải bài tập.
  var GLOSSARY = [
    { land: 'ocean', re: /khong gian mau/, title: 'Không gian mẫu',
      body: 'Không gian mẫu của một phép thử là **tập hợp tất cả kết quả có thể xảy ra**. Ký hiệu Ω.\n- Tung 1 đồng xu: Ω = {S, N}, có 2 kết quả.\n- Tung 1 xúc xắc: Ω = {1, 2, 3, 4, 5, 6}.\nLiệt kê đủ kết quả, không sót, không trùng là bước đầu tiên của mọi bài xác suất.',
      ask: 'Tung 2 đồng xu liên tiếp thì không gian mẫu gồm những kết quả nào?' },
    { land: 'castle', re: /bien co doi/, title: 'Biến cố đối',
      body: 'Biến cố đối của A (ký hiệu Ā) xảy ra khi và chỉ khi **A không xảy ra**.\nCông thức: P(Ā) = 1 − P(A).\nVí dụ: nếu xác suất trời mưa là 0,3 thì xác suất trời không mưa là 1 − 0,3 = 0,7.',
      ask: 'Nếu xác suất một bạn đến lớp đúng giờ là 0,9 thì xác suất bạn đó đi trễ là bao nhiêu?' },
    { land: 'ocean', re: /bien co/, title: 'Biến cố',
      body: 'Biến cố là **một tập con của không gian mẫu**, tức là một nhóm các kết quả mà ta quan tâm.\nVí dụ: tung xúc xắc, biến cố A "ra mặt chẵn" = {2, 4, 6}.',
      ask: 'Với xúc xắc, biến cố "ra mặt lớn hơn 4" gồm những kết quả nào?' },
    { land: 'ocean', re: /phep thu/, title: 'Phép thử',
      body: 'Phép thử là hành động mà **ta biết các kết quả có thể xảy ra nhưng không đoán trước được** kết quả của lần thực hiện cụ thể (tung đồng xu, rút bóng, gieo xúc xắc...).',
      ask: 'Hãy kể một phép thử trong đời sống mà bạn gặp hôm nay.' },
    { land: 'castle', re: /xac suat thuc nghiem|tan suat/, title: 'Xác suất thực nghiệm (tần suất)',
      body: 'Xác suất thực nghiệm = **số lần biến cố xảy ra ÷ tổng số lần thử**.\nVí dụ: tung đồng xu 50 lần, 27 lần ra mặt ngửa thì tần suất mặt ngửa là 27/50 = 0,54.\nXác suất lý thuyết là con số "lý tưởng" (0,5), còn xác suất thực nghiệm thay đổi theo từng lần thử; khi thử rất nhiều lần, nó thường tiến gần giá trị lý thuyết.',
      ask: 'Vì sao tung 10 lần chưa chắc ra đúng 5 lần ngửa?' },
    { land: 'castle', re: /xac suat/, title: 'Xác suất lý thuyết',
      body: 'Khi các kết quả **đồng khả năng**: P(A) = số kết quả thuận lợi cho A ÷ tổng số kết quả có thể.\nVí dụ: xúc xắc, P(ra mặt chẵn) = 3/6 = 1/2.\nXác suất luôn nằm trong đoạn [0; 1].',
      ask: 'Một túi có 3 bi đỏ và 2 bi xanh. Rút ngẫu nhiên 1 bi, vì sao xác suất ra bi đỏ không phải 1/2?' },
    { land: 'mean', re: /trung binh/, title: 'Trung bình cộng',
      body: 'Trung bình cộng = **tổng các giá trị ÷ số giá trị**.\nVí dụ: 2, 4, 6 có tổng 12, chia 3 giá trị được 4.\nNó cho biết "mức giữa" của dữ liệu, nhưng dễ bị kéo lệch bởi giá trị quá lớn hoặc quá nhỏ.',
      ask: 'Nếu thêm số 100 vào dãy 2, 4, 6 thì trung bình thay đổi thế nào?' },
    { land: 'mean', re: /trung vi/, title: 'Trung vị',
      body: 'Sắp xếp dữ liệu tăng dần. Trung vị là **giá trị chính giữa**.\n- Số giá trị lẻ: lấy giá trị ở giữa.\n- Số giá trị chẵn: lấy trung bình cộng của hai giá trị giữa.\nTrung vị ít bị ảnh hưởng bởi giá trị ngoại lai nên phù hợp khi dữ liệu có số rất lớn hoặc rất nhỏ.',
      ask: 'Trung vị của 1, 2, 3, 4 được tính như thế nào?' },
    { land: 'mean', re: /$^/, raw: /(^|[^\p{L}])mốt([^\p{L}]|$)/u, title: 'Mốt',
      body: 'Mốt là **giá trị xuất hiện nhiều lần nhất** trong mẫu số liệu. Một mẫu có thể có nhiều mốt, hoặc không có mốt nếu mọi giá trị chỉ xuất hiện một lần.\nVí dụ: 2, 3, 3, 4 có mốt là 3.',
      ask: 'Cửa hàng giày nên quan tâm mốt hay trung bình của cỡ giày bán ra? Vì sao?' },
    { land: 'variation', re: /khoang bien thien/, title: 'Khoảng biến thiên',
      body: 'Khoảng biến thiên = **giá trị lớn nhất − giá trị nhỏ nhất**.\nVí dụ: 4, 7, 9, 15 có khoảng biến thiên 15 − 4 = 11.\nNó đo độ trải rộng của dữ liệu nhưng chỉ dựa vào hai giá trị ở hai đầu.',
      ask: 'Hai lớp cùng điểm trung bình 7, lớp nào có khoảng biến thiên nhỏ hơn thì điểm đồng đều hơn. Vì sao?' },
    { land: 'variation', re: /tu phan vi|iqr|q1|q3/, title: 'Khoảng tứ phân vị',
      body: 'Khoảng tứ phân vị ΔQ = Q₃ − Q₁ cho biết **độ rộng của nửa dữ liệu ở giữa**, nên ít bị ảnh hưởng bởi giá trị quá lớn hoặc quá nhỏ.\nCách tìm: sắp xếp tăng dần, chia làm hai nửa (nếu n lẻ thì bỏ trung vị). Q₁ là trung vị nửa dưới, Q₃ là trung vị nửa trên.\nVí dụ: 2, 4, 5, 7, 8, 10, 12 có Q₁ = 4, Q₃ = 10 nên ΔQ = 6.',
      ask: 'Vì sao khoảng tứ phân vị ít bị ảnh hưởng bởi giá trị ngoại lệ hơn khoảng biến thiên?' },
    { land: 'variation', re: /phuong sai/, title: 'Phương sai',
      body: 'Phương sai đo **mức độ các giá trị lệch khỏi trung bình**: s² = [(x₁ − x̄)² + … + (xₙ − x̄)²] ÷ n.\nVí dụ: dãy 4, 6, 8 có x̄ = 6, độ lệch là −2, 0, 2 nên s² = (4 + 0 + 4) ÷ 3 ≈ 2,67.\nPhương sai càng lớn thì dữ liệu càng phân tán.',
      ask: 'Vì sao ta bình phương độ lệch thay vì cộng thẳng các độ lệch?' },
    { land: 'variation', re: /do lech chuan/, title: 'Độ lệch chuẩn',
      body: 'Độ lệch chuẩn là **căn bậc hai của phương sai**: s = √s².\nƯu điểm: có **cùng đơn vị** với dữ liệu nên dễ hiểu hơn (điểm số thì độ lệch chuẩn cũng tính bằng điểm).\nVí dụ: s² ≈ 2,67 thì s ≈ 1,63.',
      ask: 'Hai tổ cùng trung bình 7 điểm; tổ A có s = 0,5, tổ B có s = 2. Tổ nào ổn định hơn?' },
    { land: 'chart', re: /tan so tuong doi/, title: 'Tần số tương đối',
      body: 'Tần số tương đối của một giá trị = **tần số ÷ tổng số dữ liệu** (thường viết dưới dạng %).\nVí dụ: lớp 40 bạn, 10 bạn thích bóng đá, tần số tương đối là 10/40 = 25%.\nTổng các tần số tương đối luôn bằng 100%.',
      ask: 'Có 8 bạn thích môn Toán trong 32 bạn. Tần số tương đối là bao nhiêu phần trăm?' },
    { land: 'chart', re: /bang tan so|tan so/, title: 'Bảng tần số',
      body: 'Bảng tần số cho biết **mỗi giá trị xuất hiện bao nhiêu lần**.\nCách lập: (1) liệt kê các giá trị khác nhau, (2) đếm số lần mỗi giá trị xuất hiện, (3) kiểm tra tổng tần số bằng số dữ liệu ban đầu.',
      ask: 'Dữ liệu 1, 2, 2, 3, 3, 3: tần số của giá trị 3 là bao nhiêu?' },
    { land: 'chart', re: /bieu do tron|hinh quat/, title: 'Biểu đồ tròn',
      body: 'Cả hình tròn là **100% dữ liệu**, mỗi hình quạt là một phần.\nGóc hình quạt = tần số tương đối × 360°.\nVí dụ: một nhóm chiếm 25% thì hình quạt có góc 0,25 × 360° = 90°.',
      ask: 'Nhóm chiếm 40% thì hình quạt có góc bao nhiêu độ?' },
    { land: 'chart', re: /bieu do duong/, title: 'Biểu đồ đường',
      body: 'Biểu đồ đường **nối các điểm dữ liệu theo thứ tự**, thích hợp để theo dõi sự thay đổi theo thời gian: tăng, giảm hay giữ nguyên.\nVí dụ: nhiệt độ trung bình các tháng trong năm.',
      ask: 'Muốn xem số học sinh vắng thay đổi qua các tuần thì nên chọn biểu đồ nào?' },
    { land: 'chart', re: /bieu do/, title: 'Biểu đồ cột',
      body: '- **Biểu đồ cột**: mỗi cột ứng với một giá trị hoặc nhóm, chiều cao cột là tần số.\n- Khi đọc biểu đồ, luôn nhìn tên trục, đơn vị và điểm bắt đầu của trục trước khi kết luận.',
      ask: 'Vì sao nên xem điểm bắt đầu của trục tung trước khi so sánh các cột?' }
  ];

  function plain(s) {
    return String(s).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  var NUM = { 'mot': 1, 'hai': 2, 'ba': 3, 'bon': 4, 'nam': 5 };
  function countOf(q, noun) {
    var m = new RegExp('(\\d+|mot|hai|ba|bon|nam)\\s*(?:dong\\s*)?' + noun).exec(q);
    if (!m) return /xuc xac|dong xu/.test(q) ? 1 : 0;
    return /^\d+$/.test(m[1]) ? +m[1] : NUM[m[1]];
  }
  // Câu hỏi "không gian mẫu gồm bao nhiêu phần tử" với đồng xu / xúc xắc: trả lời đúng số, không giải bài tập quiz.
  function sampleSpace(q) {
    if (!/khong gian mau|bao nhieu (phan tu|ket qua)/.test(q)) return '';
    var isCoin = /dong xu/.test(q), isDice = /xuc xac/.test(q);
    if (isCoin === isDice) return '';
    var n = countOf(q, isCoin ? 'dong\\s*xu' : 'xuc\\s*xac');
    if (!n || n > 4) return '';
    var base = isCoin ? 2 : 6, total = Math.pow(base, n);
    var what = isCoin ? 'đồng xu cân đối' : 'xúc xắc cân đối';
    var s = '**' + (n === 1 ? 'Gieo 1 ' : 'Gieo ' + n + ' ') + what + '**: mỗi lần có ' + base + ' kết quả' +
      (isCoin ? ' (S = sấp, N = ngửa)' : ' (mặt 1 đến 6)') + '.';
    if (n === 1) s += '\nΩ = ' + (isCoin ? '{S, N}' : '{1, 2, 3, 4, 5, 6}') + ' nên **n(Ω) = ' + base + '**.';
    else s += '\nXét thứ tự các lần gieo: n(Ω) = ' + Array(n + 1).join(base + ' × ').slice(0, -3) + ' = **' + total + '**.';
    return s;
  }

  // Trả về { text } – luôn có nội dung.
  function offlineReply(message, mode, landId) {
    var q = plain(message);
    var raw = String(message).toLowerCase().normalize('NFC');
    var direct = (mode === 'lesson' && get().activeQuestion) ? '' : sampleSpace(q); // đang làm quiz thì không nêu đáp án số
    var hits = GLOSSARY.filter(function (g) { return g.re.test(q) || (g.raw && g.raw.test(raw)); });
    // Mỗi chủ đề chỉ giữ mục cụ thể nhất: "biến cố đối" thì bỏ "biến cố", "tần số tương đối" thì bỏ "bảng tần số"...
    var drop = { 'Biến cố đối': 'Biến cố', 'Tần số tương đối': 'Bảng tần số', 'Biểu đồ tròn': 'Biểu đồ cột', 'Biểu đồ đường': 'Biểu đồ cột',
      'Xác suất thực nghiệm (tần suất)': 'Xác suất lý thuyết' };
    hits = hits.filter(function (g) { return !hits.some(function (o) { return drop[o.title] === g.title; }); });
    if (hits.length > 1) hits = hits.filter(function (g) { return g.title !== 'Xác suất lý thuyết' || /ly thuyet/.test(q); });
    // Câu hỏi nêu rõ vùng khác ngoài vùng hiện tại thì ưu tiên mục của vùng hiện tại khi có
    if (hits.length > 1 && mode === 'lesson' && landId) {
      var same = hits.filter(function (g) { return g.land === landId; });
      if (same.length) hits = same;
    }
    if (direct) {
      var ssHit = hits.filter(function (g) { return g.title === 'Không gian mẫu'; })[0];
      return direct + '\n\n(Mình đang ở **chế độ ngoại tuyến** nên chỉ trả lời nhanh phần này; bật máy chủ AI để được giải thích đầy đủ.)\n\n🤔 Thử trả lời nhé: ' + (ssHit ? ssHit.ask : 'Tung 2 đồng xu thì không gian mẫu gồm những kết quả nào?');
    }
    // nút "Giải thích kiến thức" ở chế độ bài học: lấy các mục của vùng đất hiện tại
    if (!hits.length && mode === 'lesson' && landId) {
      hits = GLOSSARY.filter(function (g) { return g.land === landId; });
    }
    hits = hits.slice(0, 2);
    if (hits.length) {
      var ask = hits[hits.length - 1].ask;
      return hits.map(function (g) { return '**' + g.title + '**\n' + g.body; }).join('\n\n') +
        '\n\n🤔 Thử trả lời nhé: ' + ask;
    }
    var names = Object.keys(LANDS).map(function (k) { return LANDS[k].name; }).join(', ');
    return 'Mình đang ở **chế độ ngoại tuyến** nên chỉ giải thích được các khái niệm cơ bản: trung bình cộng, trung vị, mốt, khoảng biến thiên, phương sai, độ lệch chuẩn, bảng tần số, tần số tương đối, phép thử, không gian mẫu, biến cố, xác suất.\n\nBạn thử hỏi một trong các khái niệm đó nhé. Các vùng đất: ' + names + '.';
  }

  root.MathoriaAIContext = {
    LANDS: LANDS,
    detectLand: detectLand,
    get: get,
    quickActions: quickActions,
    offlineReply: offlineReply
  };
})(typeof self !== 'undefined' ? self : this);
