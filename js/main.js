// Khởi tạo các tương tác sau khi trang đã tải xong.
document.addEventListener("DOMContentLoaded", () => {
    // Chơi lại từ đầu: xóa tiến trình pha lê.
  const resetProgressButton =
    document.getElementById("resetProgressButton");

  resetProgressButton.addEventListener("click", () => {
    const confirmReset = confirm(
      "Bạn có chắc chắn muốn chơi lại từ đầu không? Toàn bộ 5 pha lê sẽ được đặt lại."
    );

    if (!confirmReset) return;

    // Xóa danh sách pha lê đã thu thập.
    localStorage.removeItem("mathoria-completed-lands");

    // Xóa tiến trình riêng của Thung lũng Biến Thiên.
    localStorage.removeItem("mathoria:variation");

    // Xóa lịch sử câu hỏi đã gặp của hệ thống quiz.
    localStorage.removeItem("mathoria_quiz_history_v1");

    // Cập nhật lại giao diện trang chủ.
    updateProgress();

    alert("Đã đặt lại hành trình! Bạn có thể khám phá lại từ đầu.");
  });
  setupExplore();
  updateProgress();

  // Phòng thí nghiệm thống kê
  const dataInput = document.getElementById("dataInput");
  const analyzeButton = document.getElementById("analyzeButton");
  function analyzeData() {
    const error = document.getElementById("dataError");
    try {
      const values = parseData(dataInput.value);
      const result = calculateStatistics(values);
      document.getElementById("meanResult").textContent = formatNumber(result.mean);
      document.getElementById("medianResult").textContent = formatNumber(result.median);
      document.getElementById("modeResult").textContent = result.modes.length
        ? result.modes.map(formatNumber).join(", ")
        : "Không có";
      document.getElementById("rangeResult").textContent = formatNumber(result.range);
      error.textContent = "";
      renderDataBars(values);
    } catch (exception) {
      error.textContent = exception.message;
    }
  }
  function renderDataBars(values) {
    const container = document.getElementById("dataBars");
    container.replaceChildren();
    const min = Math.min(...values);
    const max = Math.max(...values);
    values.forEach(value => {
      const bar = document.createElement("div");
      bar.className = "data-bar";
      const height = max === min ? 70 : 18 + ((value - min) / (max - min)) * 52;
      bar.style.height = `${height}px`;
      const label = document.createElement("span");
      label.textContent = formatNumber(value);
      bar.appendChild(label);
      container.appendChild(bar);
    });
  }
  analyzeButton.addEventListener("click", analyzeData);
  dataInput.addEventListener("keydown", event => {
    if (event.key === "Enter") analyzeData();
  });
  analyzeData();

  // Phòng thí nghiệm xác suất
  const coin = document.getElementById("coin");
  document.getElementById("tossButton").addEventListener("click", () => {
    const result = coinExperiment.toss();
    coin.classList.remove("flip");
    // Buộc trình duyệt khởi động lại animation.
    void coin.offsetWidth;
    coin.classList.add("flip");
    coin.textContent = result === "NGỬA" ? "N" : "S";
    document.getElementById("coinCaption").textContent = `Kết quả lần này: ${result}`;
    document.getElementById("tossCount").textContent = coinExperiment.tosses;
    const frequency = coinExperiment.getHeadsFrequency();
    const percent = Math.round(frequency * 100);
    document.getElementById("headsRate").textContent = `${percent}%`;
    document.getElementById("headsTrack").style.width = `${percent}%`;
  });
  document.getElementById("resetToss").addEventListener("click", () => {
    coinExperiment.reset();
    coin.textContent = "?";
    document.getElementById("coinCaption").textContent = "Sẵn sàng thử nghiệm";
    document.getElementById("tossCount").textContent = "0";
    document.getElementById("headsRate").textContent = "0%";
    document.getElementById("headsTrack").style.width = "0%";
  });
});
