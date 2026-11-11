// Các hàm thống kê cơ bản. Dữ liệu đầu vào phải là một mảng số hữu hạn.
function parseData(input) {
  const parts = input.split(",").map(item => item.trim());
  if (!parts.length || parts.some(item => item === "")) {
    throw new Error("Hãy nhập các số và ngăn cách bằng dấu phẩy.");
  }
  const values = parts.map(Number);
  if (values.some(value => !Number.isFinite(value))) {
    throw new Error("Dữ liệu không hợp lệ. Chỉ nhập các giá trị số.");
  }
  return values;
}

function calculateStatistics(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Cần ít nhất một giá trị để phân tích.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;

  const frequencies = new Map();
  sorted.forEach(value => frequencies.set(value, (frequencies.get(value) || 0) + 1));
  const highestFrequency = Math.max(...frequencies.values());
  // Nếu mọi giá trị chỉ xuất hiện một lần thì tập dữ liệu không có mốt.
  const modes = highestFrequency === 1
    ? []
    : [...frequencies.entries()]
        .filter(([, frequency]) => frequency === highestFrequency)
        .map(([value]) => value);

  return {
    mean: sum / values.length,
    median,
    modes,
    range: sorted[sorted.length - 1] - sorted[0],
    sorted
  };
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}
