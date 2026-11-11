// Bản đồ MATHORIA: chuyển sang trang đảo và hiển thị tiến trình pha lê.
// Các trang đảo ghi id đảo đã hoàn thành vào cùng một khóa localStorage này.
const STORAGE_KEY = "mathoria-completed-lands";
const EXPLORE_DELAY = 1400; // ms, khớp với thanh tiến trình 1,3 s trong CSS

// Đọc danh sách đảo đã hoàn thành; bỏ id lạ và id trùng.
function getCompletedLands() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? [...new Set(saved)].filter(id => id in lands)
      : [];
  } catch {
    return [];
  }
}

function updateProgress() {
  const total = Object.keys(lands).length;
  const count = getCompletedLands().length;
  document.getElementById("crystalCount").textContent = `${count} ✧`;
  document.getElementById("progressCount").textContent = `${count}/${total}`;
  document.getElementById("progressText").textContent = `Bạn đã thu thập ${count}/${total} pha lê vùng đất.`;
  document.getElementById("progressBar").style.width = `${count / total * 100}%`;
}

// Bấm đảo: hiện chữ "Khám phá Vùng Đất" rồi chuyển sang trang của đảo.
function setupExplore() {
  const overlay = document.getElementById("exploreOverlay");
  const sub = document.getElementById("exploreSub");
  let busy = false;

  document.querySelectorAll(".island[data-land]").forEach(button => {
    button.addEventListener("click", () => {
      const land = lands[button.dataset.land];
      if (!land || busy) return;
      busy = true;
      sub.textContent = land.name;
      overlay.classList.add("show");
      setTimeout(() => { window.location.href = encodeURI(land.page); }, EXPLORE_DELAY);
    });
  });

  // Quay lại bằng nút Back: tắt lớp phủ và cập nhật lại số pha lê.
  window.addEventListener("pageshow", () => {
    busy = false;
    overlay.classList.remove("show");
    updateProgress();
  });
}
