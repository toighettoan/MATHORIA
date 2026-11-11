// Dữ liệu 5 vùng đất của MATHORIA (nguồn duy nhất cho tên đảo và trang đích).
// Khóa (mean, variation, ...) trùng với thuộc tính data-land trên bản đồ
// và với ISLAND_ID mà từng trang đảo ghi vào localStorage.
const lands = {
  mean:      { name: "Đảo Trung Bình",        page: "dao-trung-binh.html" },
  variation: { name: "Thung lũng Biến Thiên", page: "thung-lung-bien-thien.html" },
  chart:     { name: "Rừng Biểu Đồ",          page: "rung-bieu-do.html" },
  ocean:     { name: "Đại Dương Ngẫu Nhiên",  page: "dai-duong-ngau-nhien.html" },
  castle:    { name: "Lâu Đài Xác Suất",      page: "lau-dai-xac-suat.html" }
};
