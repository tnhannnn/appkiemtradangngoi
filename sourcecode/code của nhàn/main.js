console.log("Kết nối JavaScript thành công");

tf.setBackend("webgl");

// ===== Biến toàn cục =====
let stream = null;
let detector = null;
let canvaOn = false;          // canvas (keypoint) có đang hiện
let isHuongDanOpen = false;   // màn hướng dẫn có đang mở
let currentKeypoints = null;  // ⬅️ nguồn dữ liệu keypoints duy nhất
let TuTheDung = null;         // baseline tư thế đúng

// Sẽ được gán sau khi DOM sẵn sàng
let video, canvas, ctx;

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("nutbatdaucam");
  const keypointToggle = document.getElementById("keypoint-toggle");
  const huongdan = document.getElementById("huongdan");
  const manHinhHuongDan = document.getElementById("man-hinh-huong-dan");

  video = document.getElementById("webcam");
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  // đặt nội dung nút
  btn.textContent = "Bắt đầu theo dõi / Lưu tư thế đúng";
  keypointToggle.textContent = "Hiện keypoint";
  huongdan.textContent = "Hiện hướng dẫn";

  // Ẩn/hiện canvas keypoints
  keypointToggle.onclick = () => {
    if (canvaOn) {
      canvas.style.display = "none";
      canvaOn = false;
      keypointToggle.textContent = "Hiện keypoint";
    } else {
      canvas.style.display = "block";
      canvaOn = true;
      keypointToggle.textContent = "Ẩn keypoint";
    }
  };

  // Ẩn/hiện hướng dẫn
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

  // Nút chính: lưu baseline tư thế đúng khi đã có keypoints
  btn.onclick = () => {
    if (currentKeypoints && currentKeypoints.length) {
      LuuTuTheDung(currentKeypoints);
      console.log("Đã lưu tư thế đúng");
    } else {
      console.log("❌ Chưa có dữ liệu keypoints từ camera");
    }
  };

  function resizeCanvas() {
    if (video && canvas) {
      canvas.width = video.videoWidth || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
    }
  }

  // Khởi tạo pose detector
  async function LoadModel() {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        modelUrl: "./models/model.json" // giữ nguyên theo setup của bạn
      }
    );
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();
      resizeCanvas();

      if (!detector) await LoadModel();

      requestAnimationFrame(loop);
    } catch (err) {
      console.error("Không thể truy cập camera:", err);
    }
  }

  // ⬅️ Hàm chỉ cập nhật keypoints (KHÔNG vẽ)
  async function updateKeypoints() {
    if (!detector || !video) return;
    const detectedPoses = await detector.estimatePoses(video);
    if (detectedPoses && detectedPoses.length > 0) {
      currentKeypoints = detectedPoses[0].keypoints;
    } else {
      currentKeypoints = null;
    }
  }

  // ⬅️ Hàm chỉ vẽ (KHÔNG đụng tới detector)
  function drawKeypoints() {
    if (!ctx || !canvas || !currentKeypoints || !canvaOn) return;

    // vẽ keypoints
    for (const keypoint of currentKeypoints) {
      if (keypoint && keypoint.score > 0.5) {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // in tên keypoint (lật chữ theo chiều video)
        ctx.save();
        ctx.translate(keypoint.x, keypoint.y);
        ctx.scale(-1, 1);
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText(keypoint.name || "", -15, 5);
        ctx.restore();
      }
    }

    // vẽ skeleton
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
  async function loop() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await updateKeypoints();  // chỉ cập nhật dữ liệu
    drawKeypoints();          // chỉ vẽ

    // (Tùy chọn) kiểm tra tư thế realtime nếu muốn
    // if (currentKeypoints) KiemTraTuThe(currentKeypoints);

    requestAnimationFrame(loop);
  }
  // 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
  // 5: left_shoulder, 6: right_shoulder
 function KiemTraTuThe(keypoints) {
    console.log("ditcu chay roi");
    const vaiTrai = keypoints[5];
    const vaiPhai = keypoints[6];
    const mui = keypoints[0];
    const taiTrai = keypoints[3];
    const taiPhai = keypoints[4];
    const matTrai = keypoints[1];
    const matPhai = keypoints[2];

    // Kiểm tra độ tin cậy của các keypoint cần thiết
    const doTinCay = 0.6; // Ngưỡng độ tin cậy tối thiểu, có thể điều chỉnh
    // Nếu một trong các keypoint quan trọng có độ tin cậy thấp, có thể người dùng chưa rõ ràng trong khung hình
    if (
      vaiTrai.score < doTinCay ||
      vaiPhai.score < doTinCay ||
      mui.score < doTinCay ||
      taiPhai.score < doTinCay ||
      taiTrai.score < doTinCay ||
      matPhai.score < doTinCay ||
      matTrai.score < doTinCay
    ) {
      statusDiv.textContent = 'Tư thế: Vui lòng vào giữa khung hình và đảm bảo đủ sáng!';
      statusDiv.classList.remove('bad-posture');
      return;
    } else {
      const gocTaimatPhaimui = goc(taiPhai, matPhai, mui);
      const gocTaimatTraimui = goc(taiTrai, matTrai, mui);

      const DO_LECH_CHO_PHEP = 15;
      const TBgoc = (gocTaimatPhaimui + gocTaimatTraimui) / 2;
      const TBgocTuTheDung = (TuTheDung.gocTaimatPhaimui + TuTheDung.gocTaimatTraimui) / 2;
      if (Math.abs(TBgoc - TBgocTuTheDung) > DO_LECH_CHO_PHEP) {
        statusDiv.textContent = 'Tư thế: Gù lưng! Hãy ngồi thẳng lưng lên!';
        statusDiv.classList.add('bad-posture');
        console.log("⚠️ Tư thế gù lưng! Hãy ngồi thẳng lưng lên!");
      } else {
        statusDiv.textContent = 'Tư thế: Đúng!';
        statusDiv.classList.remove('bad-posture');
        console.log("✅ Tư thế đúng!");
      }
    }
  }
  let TuTheDung = null; // biến toàn cục lưu tư thế chuẩn

  async function LuuTuTheDung(keypoints) {
    const vaiTrai = keypoints[5];
    const vaiPhai = keypoints[6];
    const mui = keypoints[0];
    const taiTrai = keypoints[3];
    const taiPhai = keypoints[4];
    const matTrai = keypoints[1];
    const matPhai = keypoints[2];

    const gocTaimatPhaimui = goc(taiPhai, matPhai, mui);
    const gocTaimatTraimui = goc(taiTrai, matTrai, mui);
    // Lưu baseline (tư thế chuẩn)
    TuTheDung = {
      gocTaimatTraimui,
      gocTaimatPhaimui,
    };

    console.log("✅ Tư thế chuẩn đã lưu:", TuTheDung);
  }
  function goc(a, b, c) {
    vectorBA = { x: a.x - b.x, y: a.y - b.y };
    vectorBC = { x: c.x - b.x, y: c.y - b.y };
    dodaiBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    dodaiBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);
    return (
      Math.acos(
        (vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y) /
          (dodaiBA * dodaiBC)
      ) *
      (180 / Math.PI)
    );
  }

  let currentKeypoints = null; // biến toàn cục lưu keypoints hiện tại
  document.getElementById("nutbatdaucam").onclick = () => {
    if (poses.length > 0) {
      LuuTuTheDung(poses[0].keypoints);
      console.log("Đã lưu tư thế đúng");
      setInterval(() => {
        KiemTraTuThe(currentKeypoints);
      }, 3000);
    } else {
      console.log("❌ Chưa có dữ liệu keypoints từ camera");
    }
  };

  window.addEventListener("resize", resizeCanvas);

  // Tự bật cam
  startCamera();
});

console.log("đã chạy xong hoàn toàn file");

// ====== Các hàm xử lý tư thế (để ngoài DOMContentLoaded cũng được) ======
async function KiemTraTuThe(keypoints) {
  const vaiTrai = keypoints[5];
  const vaiPhai = keypoints[6];
  const mui = keypoints[0];
  const taiTrai = keypoints[3];
  const taiPhai = keypoints[4];
  const matTrai = keypoints[1];
  const matPhai = keypoints[2];

  const doTinCay = 0.6;
  if (
    !vaiTrai || !vaiPhai || !mui || !taiTrai || !taiPhai || !matTrai || !matPhai ||
    vaiTrai.score < doTinCay ||
    vaiPhai.score < doTinCay ||
    mui.score < doTinCay ||
    taiPhai.score < doTinCay ||
    taiTrai.score < doTinCay ||
    matPhai.score < doTinCay ||
    matTrai.score < doTinCay
  ) {
    // Không đủ tin cậy -> bỏ qua
    return false;
  }

  const gocTaimatPhaimui = goc(taiPhai, matPhai, mui);
  const gocTaimatTraimui = goc(taiTrai, matTrai, mui);

  const DO_LECH_CHO_PHEP = 15;
  const TBgoc = (gocTaimatPhaimui + gocTaimatTraimui) / 2; // ⬅️ FIX typo
  if (!TuTheDung) {
    console.log("⚠️ Chưa lưu tư thế chuẩn (baseline).");
    return false;
  }
  const TBgocTuTheDung = (TuTheDung.gocTaimatPhaimui + TuTheDung.gocTaimatTraimui) / 2;

  if (Math.abs(TBgoc - TBgocTuTheDung) > DO_LECH_CHO_PHEP) {
    console.log("⚠️ Tư thế gù lưng! Hãy ngồi thẳng lưng lên!");
    return false;
  } else {
    console.log("✅ Tư thế đúng!");
    return true;
  }
}

async function LuuTuTheDung(keypoints) {
  const vaiTrai = keypoints[5];
  const vaiPhai = keypoints[6];
  const mui = keypoints[0];
  const taiTrai = keypoints[3];
  const taiPhai = keypoints[4];
  const matTrai = keypoints[1];
  const matPhai = keypoints[2];

  const gocTaimatPhaimui = goc(taiPhai, matPhai, mui);
  const gocTaimatTraimui = goc(taiTrai, matTrai, mui);

  TuTheDung = { gocTaimatTraimui, gocTaimatPhaimui };
  console.log("✅ Tư thế chuẩn đã lưu:", TuTheDung);
}

function goc(a, b, c) {
  // vector BA = A - B; vector BC = C - B
  const vectorBA = { x: a.x - b.x, y: a.y - b.y };
  const vectorBC = { x: c.x - b.x, y: c.y - b.y };

  const dodaiBA = Math.hypot(vectorBA.x, vectorBA.y);
  const dodaiBC = Math.hypot(vectorBC.x, vectorBC.y);
  if (dodaiBA === 0 || dodaiBC === 0) return 0;

  // Chặn sai số float để acos không ném ngoại lệ
  let cos = (vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y) / (dodaiBA * dodaiBC);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos) * (180 / Math.PI);
}
