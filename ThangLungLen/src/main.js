console.log("Kết nối JavaScript thành công");

tf.setBackend("webgl");

// ===== Biến toàn cục =====
let isLichSuGuOn = false;
let stream = null;
let detector = null;
let isCanvaOn = false;
let isHuongDanOpen = false;
let currentKeypoints = null;
let TuTheDung = null;
let isThangLung = true;
let isBatDau = false;
let video, canvas, ctx;
const matHien =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"  ><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z"/></svg>';
const matAn =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M792-56 624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM480-320q11 0 20.5-1t20.5-4L305-541q-3 11-4 20.5t-1 20.5q0 75 52.5 127.5T480-320Zm292 18L645-428q7-17 11-34.5t4-37.5q0-75-52.5-127.5T480-680q-20 0-37.5 4T408-664L306-766q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302ZM587-486 467-606q28-5 51.5 4.5T559-574q17 18 24.5 41.5T587-486Z"/></svg>';

document.addEventListener("DOMContentLoaded", async () => {
  // chờ DOM(html) load xong
  const btn = document.getElementById("nutbatdau");
  const keypointToggle = document.getElementById("keypoint-toggle");
  const huongdan = document.getElementById("huongdan");
  const manHinhHuongDan = document.getElementById("man-hinh-huong-dan");
  const lichSuGuBtn = document.getElementById("lichsugu");
  const manHinhLichSuGu = document.getElementById("lich-su-gu");
  const closeLichSuGu = document.getElementById("close-lichsugu");
  video = document.getElementById("webcam");
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  lichSuGuBtn.onclick = () => {
    if (!isLichSuGuOn) {
      hienThiLichSuGu();
      manHinhLichSuGu.showModal();
      requestAnimationFrame(() => {
        manHinhLichSuGu.classList.add("hien");
      });
      lichSuGuBtn.textContent = "Ẩn lịch sử gù";
      isLichSuGuOn = true;
      capNhatFeedback();
    } else {
      manHinhLichSuGu.classList.remove("hien");
      setTimeout(() => {
        manHinhLichSuGu.close();
      }, 400);
      lichSuGuBtn.textContent = "Hiện lịch sử gù";
      isLichSuGuOn = false;
    }
  };
  closeLichSuGu.onclick = () => {
    manHinhLichSuGu.close();
    isLichSuGuOn = false;
    lichSuGuBtn.textContent = "Hiện lịch sử gù";
  };
  lichSuGuBtn.textContent = "Hiện lịch sử gù";
  btn.textContent = "Bắt đầu theo dõi";
  keypointToggle.innerHTML = matHien;
  huongdan.textContent = "Hiện hướng dẫn";

  keypointToggle.onclick = () => {
    if (isCanvaOn) {
      canvas.style.display = "none";
      isCanvaOn = false;
      keypointToggle.innerHTML = matHien;
    } else {
      canvas.style.display = "block";
      isCanvaOn = true;
      keypointToggle.innerHTML = matAn;
    }
  };

  huongdan.onclick = () => {
    if (!isHuongDanOpen) {
      manHinhHuongDan.style.visibility = "visible";
      huongdan.textContent = "Ẩn hướng dẫn";
      isHuongDanOpen = true;
    } else {
      manHinhHuongDan.style.visibility = "hidden";
      huongdan.textContent = "Hiện hướng dẫn";
      isHuongDanOpen = false;
    }
  };

  btn.onclick = () => {
    if (currentKeypoints && currentKeypoints.length && !isBatDau) {
      LuuTuTheDung(currentKeypoints);
      CanhBao("✅ Đã lưu tư thế đúng! Bắt đầu theo dõi...", "green");
      btn.textContent = "Dừng theo dõi";
      isBatDau = true;
    } else {
      if (isBatDau) {
        btn.textContent = "Bắt đầu theo dõi";
        CanhBao(
          "⚠️ Đã dừng theo dõi. Ngồi đúng tư thế và nhấn 'Bắt đầu theo dõi' để tiếp tục.",
          "orange"
        );
        isBatDau = false;
        TuTheDung = null;
        isThangLung = true;
      } else {
        CanhBao("⚠️ Chưa có dữ liệu keypoints từ camera", "red");
      }
    }
  };

  function resizeCanvas() {
    if (video && canvas) {
      canvas.width = video.videoWidth || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
    }
  }

  async function khoiTaoDetector() {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        modelUrl: "./assets/models/model.json",
      }
    );
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();
      resizeCanvas();

      if (!detector) await khoiTaoDetector();
      requestAnimationFrame(loop);
    } catch (err) {
      alert("Không thể truy cập camera:", err);
    }
  }

  window.addEventListener("resize", resizeCanvas);

  startCamera();
});

// gọi estimatePoses giới hạn 10 lần/giây
let lastDetectTime = 0;
async function updateKeypoints(timestamp) {
  if (!detector) {
    console.warn("detector chưa khởi tạo");
    CanhBao("❌ detector chưa khởi tạo", "red");
    return;
  }
  const poses = await detector.estimatePoses(video);
  if (poses.length > 0) {
    currentKeypoints = poses[0].keypoints;
  } else {
    currentKeypoints = null;
  }
}

//===== Lọc nhiễu keypoints =====
let buffer = [];
const MAX_BUFFER = 30;
function addToBuffer(keypoints) {
  buffer.push(keypoints);
  if (buffer.length > MAX_BUFFER) buffer.shift();
}
function lamMuotKeypoints() {
  if (buffer.length === 0) return null;
  const frameCount = buffer.length;
  return buffer[0].map((_, index) => {
    let totalX = 0,
      totalY = 0,
      totalScore = 0;
    for (const frame of buffer) {
      const kp = frame[index];
      totalX += kp.x;
      totalY += kp.y;
      totalScore += kp.score;
    }
    return {
      x: totalX / frameCount,
      y: totalY / frameCount,
      score: totalScore / frameCount,
    };
  });
}

// Hàm vẽ keypoints + skeleton
function veKeypoints() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!currentKeypoints || !isCanvaOn) return;
  for (const keypoint of currentKeypoints) {
    if (keypoint && keypoint.score > 0.5) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.save();
      ctx.translate(keypoint.x, keypoint.y);
      ctx.scale(-1, 1);
      ctx.fillStyle = "white";
      ctx.font = "10px Arial";
      ctx.fillText(keypoint.name || "", -15, 5);
      ctx.restore();
    }
  }
  const adjacentPairs = poseDetection.util.getAdjacentPairs(
    poseDetection.SupportedModels.MoveNet
  );
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  for (const [i, j] of adjacentPairs) {
    const kp1 = currentKeypoints[i];
    const kp2 = currentKeypoints[j];
    if (kp1 && kp2 && kp1.score > 0.5 && kp2.score > 0.5) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  }
}

// Vòng lặp khung hình
const doTreKiemTra = 100;
let thoiDiemKiemTraGanNhat = 0;
let animationId = null;
let isRunning = true;

async function loop(timestamp) {
  if (!isRunning) return;
  await updateKeypoints(timestamp);
  veKeypoints();
  if (
    TuTheDung &&
    currentKeypoints &&
    timestamp - thoiDiemKiemTraGanNhat > doTreKiemTra
  ) {
    addToBuffer(currentKeypoints);
    const smoothedKeypoints = lamMuotKeypoints();
    KiemTraTuThe(smoothedKeypoints);
    thoiDiemKiemTraGanNhat = timestamp;
  }
  phatAmThanh();
  kiemTraNgoiLau();
  animationId = requestAnimationFrame(loop);
}

function startLoop() {
  if (!isRunning) {
    isRunning = true;
    animationId = requestAnimationFrame(loop);
  }
}
function stopLoop() {
  isRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// ====== Các hàm xử lý tư thế ======
async function KiemTraTuThe(keypoints) {
  const vaiTrai = keypoints[5];
  const vaiPhai = keypoints[6];
  const mui = keypoints[0];
  const taiTrai = keypoints[3];
  const taiPhai = keypoints[4];
  const doTinCay = 0.3;
  if (
    !vaiTrai ||
    !vaiPhai ||
    !mui ||
    !taiTrai ||
    !taiPhai ||
    vaiTrai.score < doTinCay ||
    vaiPhai.score < doTinCay ||
    mui.score < doTinCay ||
    taiPhai.score < doTinCay ||
    taiTrai.score < doTinCay
  ) {
    CanhBao(
      "⚠️ Có vẻ bạn đã ra khỏi khung hình hoặc keypoint không rõ!",
      "red"
    );
    return false;
  }
  if (!TuTheDung) {
    CanhBao(
      "⚠️ Chưa lưu tư thế chuẩn (baseline). Hãy ngồi thẳng lưng và nhấn nút 'Bắt đầu theo dõi'",
      "red"
    );
    return false;
  }
  const shoulderWidth = khoangcach(vaiTrai, vaiPhai);
  const TrungDiemVai = {
    x: (vaiTrai.x + vaiPhai.x) / 2,
    y: (vaiTrai.y + vaiPhai.y) / 2,
  };
  const dMuiTrungDiemVai = khoangcach(mui, TrungDiemVai) / shoulderWidth;
  const dTaiVaiTrai = khoangcach(taiTrai, vaiTrai) / shoulderWidth;
  const dTaiVaiPhai = khoangcach(taiPhai, vaiPhai) / shoulderWidth;
  const gocTrai = goc(vaiTrai, taiTrai, mui);
  const gocPhai = goc(vaiPhai, taiPhai, mui);
  const TB_goc = (gocTrai + gocPhai) / 2;
  const gocTaiMatMuiTrai = goc(taiTrai, mui, vaiTrai);
  const gocTaiMatMuiPhai = goc(taiPhai, mui, vaiPhai);
  const TB_gocTaiMatMui = (gocTaiMatMuiTrai + gocTaiMatMuiPhai) / 2;
  const NGUONG_DIST = 0.1;
  const NGUONG_GOC = 15;
  let canhbao = "";
  if (Math.abs(dMuiTrungDiemVai - TuTheDung.dMuiTrungDiemVai) > NGUONG_DIST) {
    canhbao = "⚠️ Đầu cúi/gập khác nhiều so với tư thế chuẩn!";
    isThangLung = false;
  } else if (
    Math.abs(dTaiVaiTrai - TuTheDung.dTaiVaiTrai) > NGUONG_DIST ||
    Math.abs(dTaiVaiPhai - TuTheDung.dTaiVaiPhai) > NGUONG_DIST
  ) {
    canhbao = "⚠️ Tai lệch nhiều so với vai (có thể gù/lệch)!";
    isThangLung = false;
  } else if (
    Math.abs(TB_goc - TuTheDung.TB_goc) > NGUONG_GOC ||
    Math.abs(TB_gocTaiMatMui - TuTheDung.TB_gocTaiMatMui) > NGUONG_GOC
  ) {
    canhbao = "⚠️ Góc cổ thay đổi nhiều (có thể gù)!";
    isThangLung = false;
  }
  if (canhbao) {
    CanhBao(canhbao, "red");
    return false;
  } else {
    CanhBao("✅ Tư thế đúng!", "green");
    isThangLung = true;
    return true;
  }
}

async function LuuTuTheDung(keypoints) {
  const vaiTrai = keypoints[5];
  const vaiPhai = keypoints[6];
  const mui = keypoints[0];
  const taiTrai = keypoints[3];
  const taiPhai = keypoints[4];
  const shoulderWidth = khoangcach(vaiTrai, vaiPhai);
  const TrungDiemVai = {
    x: (vaiTrai.x + vaiPhai.x) / 2,
    y: (vaiTrai.y + vaiPhai.y) / 2,
  };
  const dMuiTrungDiemVai = khoangcach(mui, TrungDiemVai) / shoulderWidth;
  const dTaiVaiTrai = khoangcach(taiTrai, vaiTrai) / shoulderWidth;
  const dTaiVaiPhai = khoangcach(taiPhai, vaiPhai) / shoulderWidth;
  const gocTrai = goc(vaiTrai, taiTrai, mui);
  const gocPhai = goc(vaiPhai, taiPhai, mui);
  const TB_goc = (gocTrai + gocPhai) / 2;
  const gocTaiMatMuiTrai = goc(taiTrai, mui, vaiTrai);
  const gocTaiMatMuiPhai = goc(taiPhai, mui, vaiPhai);
  const TB_gocTaiMatMui = (gocTaiMatMuiTrai + gocTaiMatMuiPhai) / 2;
  TuTheDung = {
    dMuiTrungDiemVai,
    dTaiVaiTrai,
    dTaiVaiPhai,
    TB_goc,
    TB_gocTaiMatMui,
  };
}
const statusDiv = document.getElementById("statusDiv");

function goc(a, b, c) {
  const vectorBA = { x: a.x - b.x, y: a.y - b.y };
  const vectorBC = { x: c.x - b.x, y: c.y - b.y };
  const dodaiBA = Math.hypot(vectorBA.x, vectorBA.y);
  const dodaiBC = Math.hypot(vectorBC.x, vectorBC.y);
  if (dodaiBA === 0 || dodaiBC === 0) return 0;
  let cosang =
    (vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y) / (dodaiBA * dodaiBC);
  cosang = Math.max(-1, Math.min(1, cosang));
  return Math.acos(cosang) * (180 / Math.PI);
}
function khoangcach(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function CanhBao(thongBao, color = "black") {
  if (statusDiv) {
    statusDiv.textContent = thongBao;
    statusDiv.style.color = color;
  }
}

// ====== Lưu lịch sử gù vào localStorage ======
const LICH_SU_GU_KEY = "lichSuGu";
const MAX_RECORDS = 1000;
const MAX_DAYS = 7;
function getLichSuGu() {
  let data = [];
  try {
    data = JSON.parse(localStorage.getItem(LICH_SU_GU_KEY)) || [];
  } catch (e) {
    data = [];
  }
  return data;
}
function setLichSuGu(data) {
  localStorage.setItem(LICH_SU_GU_KEY, JSON.stringify(data));
}
function themLanGu() {
  let data = getLichSuGu();
  const now = Date.now();
  const minTime = now - MAX_DAYS * 24 * 60 * 60 * 1000;
  data = data.filter((item) => item.time >= minTime);
  if (data.length >= MAX_RECORDS) {
    data = data.slice(data.length - MAX_RECORDS + 1);
  }
  data.push({ time: now });
  setLichSuGu(data);
}
function hienThiLichSuGu() {
  const data = getLichSuGu();
  const thongkegu = document.getElementById("thongkegu");
  if (!thongkegu) return;
  if (data.length === 0) {
    thongkegu.innerHTML = "<i>Chưa có lần gù nào trong 7 ngày gần đây</i>";
    return;
  }
  thongkegu.innerHTML = `
    <b>Đã ghi nhận ${data.length} lần gù trong 7 ngày gần nhất:</b>
    <button id="btn-xoa-lichsu" onclick="xoaLichSuGu()">Xoá lịch sử gù</button>
    <ul id="list-lichsu">
      ${data
        .slice()
        .reverse()
        .map((item) => `<li>${new Date(item.time).toLocaleString()}</li>`)
        .join("")}
    </ul>
  `;
}

// ====== Phát âm thanh cảnh báo & lưu lịch sử gù ======
let thoiDiemSai = null;
let isCanhBao = false;
function phatAmThanh() {
  const audio = document.getElementById("audio");
  if (isThangLung) {
    thoiDiemSai = null;
    if (isCanhBao) {
      audio.pause();
      audio.currentTime = 0;
      isCanhBao = false;
    }
  } else {
    if (!thoiDiemSai) thoiDiemSai = Date.now();
    let thoiGianSai = Date.now() - thoiDiemSai;
    if (thoiGianSai > 5000 && !isCanhBao) {
      audio.currentTime = 0;
      audio.play().catch((err) => console.log("ko phat duoc", err));
      isCanhBao = true;
      themLanGu();
      thoiDiemSai = Date.now();
      soLanGu++;
      capNhatFeedback();
    }
    if (isCanhBao && thoiGianSai > 5000) {
      audio.currentTime = 0;
      audio.play().catch((err) => console.log("ko phat duoc", err));
      thoiDiemSai = Date.now();
    }
  }
}
function xoaLichSuGu() {
  localStorage.removeItem(LICH_SU_GU_KEY);
  const thongkegu = document.getElementById("thongkegu");
  if (thongkegu) {
    thongkegu.innerHTML = "<i>Đã xoá toàn bộ lịch sử gù</i>";
  }
}
console.log("Script đã tải xong.");
//===== Feedback gợi ý khi mở lịch sử gù =====
let soLanGu = 0;
// Thêm biến lưu thời điểm mở web
const thoiDiemMoWeb = Date.now();

function capNhatFeedback() {
  const feedbackEl = document.getElementById("feedback");
  const data = getLichSuGu();
  if (data.length === 0) {
    feedbackEl.style.display = "none";
    return;
  }
  feedbackEl.style.display = "block";
  const now = Date.now();
  const THOI_GIAN_CHECK = 30 * 60 * 1000;
  const minTime = now - THOI_GIAN_CHECK;
  const guGanDay = data.filter((item) => item.time >= minTime);
  const soLanGuGanDay = guGanDay.length;
  // Sửa cách tính thoiGianNghe: chỉ tính từ lúc mở web
  const thoiGianNghe = Math.floor((now - thoiDiemMoWeb) / (1000 * 60));
  let message = "";
  if (soLanGuGanDay === 0) {
    message = "👍 Bạn giữ tư thế rất tốt trong 30 phút gần đây!";
    feedbackEl.className = "feedback-box feedback-good";
  } else if (soLanGuGanDay < 5) {
    message = `⚠️ Bạn đã gù ${soLanGuGanDay} lần trong  gần 30 phút qua. Chú ý giữ lưng thẳng nhé.`;
    feedbackEl.className = "feedback-box feedback-warning";
  } else {
    message = `🚨 Bạn đã gù ${soLanGuGanDay} lần chỉ trong 30 phút! Có thể nên nghỉ ngơi, đứng dậy và vươn vai.`;
    feedbackEl.className = "feedback-box feedback-warning";
  }
  if (thoiGianNghe >= 60) {
    message += `\n⏰ Bạn đã ngồi học ${thoiGianNghe} phút liên tục. Hãy đứng lên đi lại hoặc tập vài động tác giãn cơ.`;
  }
  if (soLanGuGanDay >= 10) {
    message += `\n💡 Gợi ý: Thử xoay vai, chống đẩy hoặc plank 1-2 phút để cải thiện tư thế.`;
  }
  feedbackEl.innerText = message;
}
// ======Thông báo gợi ý khi ngồi gù quá lâu =====
let thoiDiemBatDau = Date.now();
let daThongBao = false;
function kiemTraNgoiLau() {
  const now = Date.now();
  const MOT_GIO = 3600000;
  if (now - thoiDiemBatDau >= MOT_GIO && !daThongBao) {
    document.getElementById("popup-ngoi-lau").style.display = "block";
    daThongBao = true;
    console.log("Đã ngồi lâu, hiển thị popup nhắc nhở.");
  }
}
document.getElementById("dong-popup").onclick = () => {
  document.getElementById("popup-ngoi-lau").style.display = "none";
  daThongBao = false;
  thoiDiemBatDau = Date.now();
};
//chuyen trang trong huong dan
const page = document.getElementsByClassName("page");
function hideAllPage() {
  for (let i = 0; i < page.length; i++) {
    page[i].style.display = "none";
  }
}
function showPage(id) {
  hideAllPage();
  document.getElementById(id).style.display = "block";
}
showPage("huongdanhocsinh");
