# MATHORIA – STAT & PROB ADVENTURE

Website học tập tương tác về Thống kê và Xác suất.

## 1. Cách mở bằng Visual Studio Code

1. Giải nén `MATHORIA.zip` (hoặc `.rar`).
2. Mở Visual Studio Code.
3. Chọn **File → Open Folder...** và chọn thư mục `MATHORIA`.
4. Mở `index.html` bằng trình duyệt. Khuyến nghị cài tiện ích **Live Server** trong VS Code, sau đó nhấn chuột phải `index.html` → **Open with Live Server**.

Phần web chạy được bằng Live Server. Riêng **Trợ lý AI (ORIONIS)** cần chạy máy chủ Node.js (mục 7); nếu chưa chạy, ORIONIS tự chuyển sang chế độ ngoại tuyến và chỉ giải thích các khái niệm cơ bản.

## 2. Cấu trúc thư mục

- `index.html`: trang chủ gồm bản đồ 5 vùng đất, phòng thí nghiệm và nhật ký pha lê.
- `dao-trung-binh.html`, `thung-lung-bien-thien.html`, `rung-bieu-do.html`, `dai-duong-ngau-nhien.html`, `lau-dai-xac-suat.html`: mỗi đảo là một trang riêng (lý thuyết, thí nghiệm, bài tập, pha lê).
- `data/`: ngân hàng câu hỏi (5 file `.json` + `questions-bundle.js` do tool sinh ra) cho quiz của các đảo.
- `css/style.css`: màu sắc, bố cục, hiệu ứng và responsive của trang chủ.
- `js/data.js`: tên và trang đích của 5 vùng đất.
- `js/statistics.js`: thuật toán thống kê cơ bản.
- `js/probability.js`: mô phỏng tung đồng xu.
- `js/world.js`: chuyển sang trang đảo, đọc pha lê từ localStorage, cập nhật tiến trình.
- `js/main.js`: kết nối sự kiện của trang chủ và phòng thí nghiệm.
- `js/quiz-engine.js`, `js/quiz-widget.js`: hệ thống quiz dùng chung; mỗi đảo gọi `MathoriaQuizWidget.mount({...})` ở cuối trang.

Các trang đảo tự chứa phần giao diện riêng, dùng chung quiz (`js/quiz-*.js`, `data/`) và khóa localStorage `mathoria-completed-lands`. Muốn đổi số câu đúng để nhận pha lê, thêm `passScore: 2` vào `mount({...})` của đảo đó.

## 3. Chức năng chính

- Bản đồ 5 vùng đất; bấm vào đảo sẽ hiện "Khám phá Vùng Đất" rồi chuyển sang trang đảo.
- Mỗi đảo chỉ trao pha lê khi trả lời đúng; tiến trình lưu bằng localStorage.
- Phòng thí nghiệm ở trang chủ: tính trung bình cộng, trung vị, mốt, khoảng biến thiên và mô phỏng tung đồng xu.

## 4. Lưu ý học thuật và kỹ thuật

- Đáp án nằm trong mã JavaScript phía trình duyệt nên phù hợp tự học và luyện tập hơn là kiểm tra có điểm.
- Tung đồng xu dùng `Math.random()` để mô phỏng; kết quả là ngẫu nhiên giả lập, không phải phép thử vật lý.
- Mốt có thể có nhiều giá trị. Nếu mọi giá trị xuất hiện đúng một lần, chương trình hiển thị “Không có”.
- Nội dung các vùng đất cần được điều chỉnh theo lớp học, chương trình và bài học mà nhóm chọn.
- Khi triển khai chính thức, cần kiểm thử các trường hợp dữ liệu rỗng, số âm, số thập phân, dữ liệu trùng lặp và dữ liệu lớn.
- Font chữ lấy từ Google Fonts nên cần kết nối Internet để tải font; website vẫn có font dự phòng nếu ngoại tuyến.

## 5. Gợi ý phát triển tiếp

1. Thêm bài kiểm tra tương tác cho từng vùng đất.
2. Chỉ trao pha lê khi học sinh trả lời đúng hoặc hoàn thành thí nghiệm.
3. Thêm mô phỏng rút bóng, tung hai xúc xắc và biểu đồ tần suất.
4. Thêm biểu đồ Chart.js và chế độ giáo viên.
5. Thêm nhật ký kiến thức và trang tổng kết hành trình.
6. Tự thiết kế hoặc sử dụng tài nguyên hình ảnh có giấy phép phù hợp; ghi nguồn trong báo cáo.

## 6. Chia việc nhóm tham khảo

- Thành viên 1: nội dung Toán học, câu hỏi và kiểm tra đáp án.
- Thành viên 2: HTML/CSS, giao diện và bản đồ.
- Thành viên 3: JavaScript, thuật toán thống kê và xác suất.
- Thành viên 4: kiểm thử, tài liệu hướng dẫn, minh chứng và báo cáo LaTeX.

Cả nhóm cần cùng kiểm tra và hiểu mã nguồn trước khi nộp.

## 7. Trợ lý AI ORIONIS (MATHORIA 2.0)

Chạy (Node.js >= 18, không cần `npm install`):

1. Sao chép `server/.env.example` thành `server/.env`. Chọn `AI_PROVIDER=gemini` (điền `GEMINI_API_KEY`) hoặc `AI_PROVIDER=openai` (điền `OPENAI_API_KEY`). Không có khóa thì chạy chế độ demo.
   **Máy chủ cần có Internet** để gọi ChatGPT/Gemini; không có mạng thì ORIONIS tự chuyển sang chế độ ngoại tuyến (bảng thuật ngữ trong trình duyệt).
2. Mở terminal tại thư mục `MATHORIA`: `node server/server.js` rồi vào http://localhost:3000.

Tệp mới:
- `js/ai-context.js`: nhận biết vùng đất theo tên trang, đọc câu hỏi quiz đang làm (chưa có đáp án) và dữ liệu Phòng thí nghiệm, bảng thuật ngữ ngoại tuyến.
- `js/ai-assistant.js`: nút nhân vật góc phải, popup chat, chuyển chế độ Chung / Theo bài học, lịch sử (localStorage `mathoria-ai-history`), trạng thái tải và lỗi.
- `server/server.js`: máy chủ + phục vụ web tĩnh (chặn truy cập `server/`, tệp ẩn).
- `server/routes/ai.js`: kiểm tra dữ liệu gửi lên, giới hạn kích thước và tần suất (mặc định 12 câu/phút/IP).
- `server/services/ai-service.js`: system prompt sư phạm 6 bước, prompt riêng 5 vùng đất, gọi OpenAI (ChatGPT) hoặc Google Gemini.
- `server/.env`: nơi duy nhất chứa API key; không được nộp kèm hay đưa lên GitHub.

Các trang HTML cũ chỉ được thêm đúng 2 thẻ `<script>` ở cuối `<body>`.

### Thiết lập và kiểm tra Gemini sau khi tải dự án

1. Cài Node.js phiên bản 18 trở lên.
2. Sao chép `server/.env.example` thành `server/.env`.
3. Tạo API key mới tại https://aistudio.google.com/apikey rồi dán vào `GEMINI_API_KEY` trong `server/.env`. Không chia sẻ hoặc commit tệp này.
4. Mở terminal tại thư mục dự án và chạy `npm start`.
5. Mở `http://localhost:3000` (không mở trực tiếp `index.html` hoặc dùng Live Server nếu chưa chạy backend).
6. Mở `http://localhost:3000/api/ai/health`. Kết quả `{"ok":true,"ai":"gemini",...}` xác nhận máy chủ đã nạp cấu hình Gemini; để xác nhận Gemini trả lời thật, hãy gửi một câu hỏi trong ORIONIS.

Nếu health báo `mock`, kiểm tra `GEMINI_API_KEY` trong `server/.env`. Nếu health báo `gemini` nhưng chat lỗi, kiểm tra Internet, API key, quyền truy cập và hạn mức Gemini. Tệp `server/.env` đã được loại bỏ khóa cũ trong bản đã chỉnh vì khóa cũ đã bị lộ; cần thay bằng khóa mới trước khi dùng AI trực tuyến.
