console.log("Kết nối JavaScript thành công");

tf.setBackend("webgl");
//back end webgl để tận dụng gpu
// ===== Biến toàn cục , các biến dùng để tính toán =====
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
//icon svg
document.addEventListener("DOMContentLoaded", async () => {
  // chờ DOM(html) load xong
  //các biến const để lưu phần tử html
  const btn = document.getElementById("nutbatdau");
  const keypointToggle = document.getElementById("keypoint-toggle");
  const huongdanDialog = document.getElementById("huongdan-dialog");
  const lichSuGuBtn = document.getElementById("lichsugu");
  const huongdan = document.getElementById("huongdan");
  const closeHuongDan = document.getElementById("close-huongdan");
  const manHinhLichSuGu = document.getElementById("lich-su-gu");
  const closeLichSuGu = document.getElementById("close-lichsugu");
  video = document.getElementById("webcam");
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  //nút lưu lịch sử
  lichSuGuBtn.onclick = () => {
    if (!isLichSuGuOn) {
      hienThiLichSuGu(); //gọi hàm
      manHinhLichSuGu.showModal(); //gọi dialog
      requestAnimationFrame(() => {
        //chờ 1 frame trống
        manHinhLichSuGu.classList.add("hien");
      });
      lichSuGuBtn.textContent = "Ẩn lịch sử gù";
      isLichSuGuOn = true;
      capNhatFeedback(); //cấp nhật mỗi lần mở lại , giảm load
    } else {
      manHinhLichSuGu.classList.remove("hien");
      setTimeout(() => {
        manHinhLichSuGu.close();
      }, 400); // 400ms trùng với animation
      lichSuGuBtn.textContent = "Hiện lịch sử gù";
      isLichSuGuOn = false;
    }
  };
  //nút X để tắt
  closeLichSuGu.onclick = () => {
    manHinhLichSuGu.classList.remove("hien");
    manHinhLichSuGu.classList.add("dong");
    setTimeout(() => {
      manHinhLichSuGu.classList.remove("dong");
      manHinhLichSuGu.close();
    }, 400); // 400ms trùng với animation
    isLichSuGuOn = false;
    lichSuGuBtn.textContent = "Hiện lịch sử gù";
  }; //đặt nội dung nút khi bắt đầu
  lichSuGuBtn.textContent = "Hiện lịch sử gù";
  btn.textContent = "Bắt đầu theo dõi";
  keypointToggle.innerHTML = matHien;
  huongdan.textContent = "Hướng dẫn";
  //xử lí chuyển đổi qua lại 2 icon của con măt hiện keypoint
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
  // Mở dialog hướng dẫn
  huongdan.onclick = () => {
    if (!isHuongDanOpen) {
      huongdanDialog.showModal();
      requestAnimationFrame(() => {
        huongdanDialog.classList.add("hien");
      });
      huongdan.textContent = "Ẩn hướng dẫn";
      isHuongDanOpen = true;
    } else {
      huongdanDialog.classList.remove("hien");
      setTimeout(() => {
        huongdanDialog.close();
      }, 400);
      huongdan.textContent = "Hướng dẫn";
      isHuongDanOpen = false;
    }
  };

  // Nút đóng hướng dẫn
  closeHuongDan.onclick = () => {
    huongdanDialog.classList.remove("hien");
    setTimeout(() => {
      huongdanDialog.close();
    }, 400);
    huongdan.textContent =  "Hướng dẫn";
    isHuongDanOpen = false;
  };
  //logic nút theo dõi/dừng theo dõi
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
        isBatDau = false; //đặt lại về false
        TuTheDung = null; //xoá giá trị tư thế đúng cũ
        isThangLung = true; //bỏ qua kiểm tra tư thế
      } else {
        CanhBao("⚠️ Chưa có dữ liệu keypoints từ camera", "red");
      }
    }
  };
  //resize canva dành cho việc resize cửa sổ để tránh lỗi
  function resizeCanvas() {
    if (video && canvas) {
      canvas.width = video.videoWidth || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
    }
  }
  //khởi tạo modelAI offline
  async function khoiTaoDetector() {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        modelUrl: "./assets/models/model.json", //model được để trong assets để tiện build
      }
    );
  }
  //bật cam
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();
      resizeCanvas();
      //resize canva cho bằng video
      if (!detector) await khoiTaoDetector();
      requestAnimationFrame(loop);
    } catch (err) {
      alert("Không thể truy cập camera:", err); //nếu lỗi thì cảnh báo
    }
  }
  //mỗi khi resize cửa sổ thì gọi hàm resizecanva
  window.addEventListener("resize", resizeCanvas);
  //tự bật cam khi mở app
  startCamera();
});

// gọi kiemTraTuThe giới hạn 10 lần/giây
let lastDetectTime = 0; //lan kiem tra gan nhat
async function updateKeypoints(timestamp) {
  if (!detector) {
    console.warn("detector chưa khởi tạo");
    CanhBao("❌ detector chưa khởi tạo", "red");
    return;
  }
  const poses = await detector.estimatePoses(video); //chờ modelAI trả giá trị vị trí bộ phận
  if (poses.length > 0) {
    currentKeypoints = poses[0].keypoints; //đặt giá trị keypoints để tính toán
  } else {
    currentKeypoints = null;
  }
}

//===== Lọc nhiễu keypoints =====
let buffer = [];
const MAX_BUFFER = 30; //tối đa 30 khung hình sau đó xoá
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
      score: totalScore / frameCount, //trả giá trị trung bình
    };
  });
}
//dùng cho người tò mò hoặc debug phát triển
// Hàm vẽ keypoints + skeleton, vị trí có màu đỏ , đường nối có màu xanh lục nhạt
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
const doTreKiemTra = 100; //100ms hay 10fps
let thoiDiemKiemTraGanNhat = 0;
let animationId = null;
let isRunning = true; //kiểm tra tư thế có chạy không
//giá trị timestamp được hệ thống tự đưa ra
async function loop(timestamp) {
  if (!isRunning) return; // nếu ko theo dõi , dừng
  await updateKeypoints(timestamp);
  veKeypoints();
  if (
    TuTheDung &&
    currentKeypoints &&
    timestamp - thoiDiemKiemTraGanNhat > doTreKiemTra
  ) {
    addToBuffer(currentKeypoints); //gọi hàm làm mượt
    const smoothedKeypoints = lamMuotKeypoints();
    KiemTraTuThe(smoothedKeypoints);
    thoiDiemKiemTraGanNhat = timestamp;
  }
  phatAmThanh(); //gọi hàm phát âm thanh , hàm sẽ tự ktra có cần phát không
  kiemTraNgoiLau(); //gọi hàm kiểm tra ngồi lâu
  animationId = requestAnimationFrame(loop);
}
//bắt đầu loop, hay còn gọi là chức năng theo dõi
function startLoop() {
  if (!isRunning) {
    isRunning = true;
    animationId = requestAnimationFrame(loop);
  }
}
//dừng loop
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
    isThangLung=false;
    audio = kodulieu;
    return false; //độ chính xác ko đủ tin cậy sẽ bỏ qua tính toán
  }
  if (!TuTheDung) {
    CanhBao(
      "⚠️ Chưa lưu tư thế chuẩn (baseline). Hãy ngồi thẳng lưng và nhấn nút 'Bắt đầu theo dõi'",
      "red"
    );
    return false; //ngoại lệ khi lỗi nào đó dẫn đến ko lưu tư thế chuẩn
  }
  //các biểu thức tính khoảng cách và giá trị góc để tính toán
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
  const NGUONG_DIST = 0.15; //vị trí điểm ko lệch quá 15%
  const NGUONG_GOC = 20; //góc ko lệch quá 20 độ
  let canhbao = ""; //khởi tạo nội dung cảnh báo
  //các trường hợp gù
  if (Math.abs(dMuiTrungDiemVai - TuTheDung.dMuiTrungDiemVai) > NGUONG_DIST) {
    canhbao = "⚠️ Đầu cúi/gập khác nhiều so với tư thế chuẩn!";
    audio = daubancui;
    isThangLung = false; 
  } else if (
    Math.abs(dTaiVaiTrai - TuTheDung.dTaiVaiTrai) > NGUONG_DIST ||
    Math.abs(dTaiVaiPhai - TuTheDung.dTaiVaiPhai) > NGUONG_DIST
  ) {
    canhbao = "⚠️ Tai lệch nhiều so với vai (có thể gù/lệch)!";
    audio = taibanlech;
    isThangLung = false;
  } else if (
    Math.abs(TB_goc - TuTheDung.TB_goc) > NGUONG_GOC ||
    Math.abs(TB_gocTaiMatMui - TuTheDung.TB_gocTaiMatMui) > NGUONG_GOC
  ) {
    canhbao = "⚠️ Góc cổ thay đổi nhiều (có thể gù)!";
    audio = goccothaydoi;
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
//hàm lưu tư thế đúng
async function LuuTuTheDung(keypoints) {
  //1 số số liệu tư thế đúng
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
//hàm tính góc để tiện sử dụng nhiều lần, dùng công thức về vector
function goc(a, b, c) {
  const vectorBA = { x: a.x - b.x, y: a.y - b.y };
  const vectorBC = { x: c.x - b.x, y: c.y - b.y };
  const dodaiBA = Math.hypot(vectorBA.x, vectorBA.y);
  const dodaiBC = Math.hypot(vectorBC.x, vectorBC.y);
  if (dodaiBA === 0 || dodaiBC === 0) return 0;
  let cosang =
    (vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y) / (dodaiBA * dodaiBC);
  cosang = Math.max(-1, Math.min(1, cosang)); //chặn giá trị hàm cos
  return Math.acos(cosang) * (180 / Math.PI);
}
//hàm tính khoảng cách, cũng dùng vector
function khoangcach(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
//hàm cảnh báo lên màn hình
function CanhBao(thongBao, color = "black") {
  if (statusDiv) {
    statusDiv.textContent = thongBao;
    statusDiv.style.color = color;
  }
}

// ====== Lưu lịch sử gù vào localStorage ======
const LICH_SU_GU_KEY = "lichSuGu";
const MAX_RECORDS = 1000; //tối đa lưu 1000 lần
const MAX_DAYS = 7; //tối đa lưu 7 ngày
//lấy data
function getLichSuGu() {
  let data = [];
  try {
    data = JSON.parse(localStorage.getItem(LICH_SU_GU_KEY)) || [];
  } catch (e) {
    data = [];
  }
  return data;
}
//đặt lịch sử gù
function setLichSuGu(data) {
  localStorage.setItem(LICH_SU_GU_KEY, JSON.stringify(data));
}
//thêm lần gù
function themLanGu() {
  let data = getLichSuGu();
  const now = Date.now();
  const minTime = now - MAX_DAYS * 24 * 60 * 60 * 1000;
  data = data.filter((item) => item.time >= minTime);
  if (data.length >= MAX_RECORDS) {
    data = data.slice(data.length - MAX_RECORDS + 1); //nếu tràn , xoá cái cũ nhất
  }
  data.push({ time: now }); //thêm giá trị
  setLichSuGu(data);
}
//render lịch sử vào trong html
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
  `; //chuyển đổi giá trị lưu trong bộ nhớ ra dạng có thể đọc được
}

// ====== Phát âm thanh cảnh báo & lưu lịch sử gù ======
const taibanlech = document.getElementById("taibanlech");
const goccothaydoi = document.getElementById("goccothaydoi");
const daubancui = document.getElementById("daubancui");
const kodulieu = document.getElementById("kodulieu");
let audio = null;
let thoiDiemSai = null;
let isCanhBao = false;
function phatAmThanh() {
  //nếu thẳng lưng trở lại , dừng audio
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
      //gù hơn 5s và chưa cảnh báo
      audio.currentTime = 0;
      audio.play().catch((err) => alert("ko phat duoc", err));
      isCanhBao = true;
      themLanGu(); //thêm lần gù (trong bộ nhớ )
      thoiDiemSai = Date.now();
      soLanGu++; //tăng số lần gù (cái mà trong 30ph)
      capNhatFeedback();
    }
    if (isCanhBao && thoiGianSai > 5000) {
      //gù hơn 5s vẫn ko sửa , 5s phát tiếp
      audio.currentTime = 0;
      audio.play().catch((err) => alert("ko phat duoc", err));
      thoiDiemSai = Date.now(); //reset thời gian để 5s sau phát lại
    }
  }
}
//hàm xoá lịch sử gù , clear toàn bộ bộ nhớ
function xoaLichSuGu() {
  localStorage.removeItem(LICH_SU_GU_KEY);
  const thongkegu = document.getElementById("thongkegu");
  if (thongkegu) {
    thongkegu.innerHTML = "<i>Đã xoá toàn bộ lịch sử gù</i>";
  }
}
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
// ======Thông báo gợi ý khi ngồi quá lâu =====
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
console.log("Script đã tải xong.");
