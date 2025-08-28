console.log("Kết nối JavaScript thành công");
//đoạn này toàn let vì ko phải để chứa thành phần html mà là chứa biến tính toán
let stream = null;
let isRunning = false; // cái này bây giờ sẽ để theo dõi cái hàm tính toán mình có đang gù không đang chạy hay ko
let detector = null;
let poses = [];
let canvaOn = false; //canva(keypoint) có đang hiện hay không
let isHuongDanOpen = false; //màn hướng dẫn có đang mở hay không
tf.setBackend("webgl");
document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("nutbatdaucam"); //đây là phàn phần html nên toàn const
  const keypointToggle = document.getElementById("keypoint-toggle");
  const huongdan = document.getElementById("huongdan");
  const manHinhHuongDan = document.getElementById("man-hinh-huong-dan");
  const video = document.getElementById("webcam");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  //dat noi dung cac nut
  btn.textContent = "Bắt đầu theo dõi";
  keypointToggle.textContent = "Hiện keypoint";
  huongdan.textContent = "Hiện hướng dẫn";
  keypointToggle.onclick = () => {
    //1 đoạn code cực ngây thơ để ẩn hiện keypoint
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
  huongdan.onclick = () => {
    //ẩn hiện cái màn hình hướng dẫn
    if (!isHuongDanOpen) {
      //có dấu ! để tư duy ngược nè, cẩn thận đớ
      manHinhHuongDan.style.visibility = "visible"; //đoạn này ko dùng display=none được , nó lỗi với cái flex ở css
      huongdan.textContent = "Ẩn hướng dẫn";
      isHuongDanOpen = true;
    } else {
      manHinhHuongDan.style.visibility = "hidden";
      huongdan.textContent = "Hiện hướng dẫn";
      isHuongDanOpen = false;
    }
  };
  function resizeCanvas() {
    if (video && canvas) {
      // Đặt kích thước canvas đúng bằng kích thước video thực tế
      canvas.width = video.videoWidth || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
      
    }
  }

  // Khởi tạo pose detector
  async function initDetector() {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        modelUrl: "./models/model.json"
      }
    );
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (video) {
        video.srcObject = stream;
        await video.play();
        resizeCanvas();
      }

      // khởi tạo detector nếu chưa có
      if (!detector) await initDetector();

      requestAnimationFrame(drawCanvas);
    } catch (err) {
      console.error("Không thể truy cập camera:", err);
      //alert("Không thể truy cập camera. Hãy kiểm tra quyền truy cập!");
    }
  }

  startCamera(); //tự gọi hàm bật cam

  async function drawCanvas() {
    if (!ctx || !canvas || !video) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detector && canvaOn) {
      poses = await detector.estimatePoses(video);

      if (poses.length > 0) {
        const pose = poses[0];

        // vẽ keypoints
        for (const keypoint of pose.keypoints) {
          if (keypoint && keypoint.score > 0.5) {
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fill();

            // in ra để debug, lật chữ lại cho đúng chiều
            ctx.save();
            // Di chuyển gốc tọa độ đến điểm keypoint
            ctx.translate(keypoint.x, keypoint.y);
            // Lật ngược trục x
            ctx.scale(-1, 1);
            // Thiết lập style
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            // Vẽ text tại gốc tọa độ mới (đã được lật), với một chút offset
            ctx.fillText(keypoint.name || "", -15, 5); // Điều chỉnh offset nếu cần
            // Khôi phục lại trạng thái canvas
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
          const kp1 = pose.keypoints[i];
          const kp2 = pose.keypoints[j];
          if (kp1 && kp2 && kp1.score > 0.5 && kp2.score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(drawCanvas);
  }

  window.addEventListener("resize", resizeCanvas);
});
console.log("da chay xong hoan toan file");
// 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
// 5: left_shoulder, 6: right_shoulder
async function KiemTraTuThe(keypoints) {
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
    //statusDiv.textContent = 'Tư thế: Vui lòng vào giữa khung hình và đảm bảo đủ sáng!';
    //statusDiv.classList.remove('bad-posture');
    return;
  }
  else {
  
   const gocTaimatPhaimui = goc(taiPhai, matPhai, mui);
   const gocTaimatTraimui = goc(taiTrai, matTrai, mui);
    
    const DO_LECH_CHO_PHEP = 15; 
    const TBgoc = (gocTaimatPhaimui+gocTaimatTramui)/2;
    const TBgocTuTheDung = (TuTheDung.gocTaimatPhaimui + TuTheDung.gocTaimatTraimui) / 2;
    if (Math.abs(TBgoc - TBgocTuTheDung) > DO_LECH_CHO_PHEP) {
      //statusDiv.textContent = 'Tư thế: Gù lưng! Hãy ngồi thẳng lưng lên!';
      //statusDiv.classList.add('bad-posture');
      console.log("⚠️ Tư thế gù lưng! Hãy ngồi thẳng lưng lên!");
    } else {
      //statusDiv.textContent = 'Tư thế: Đúng!';
      //statusDiv.classList.remove('bad-posture');
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
    gocTaimatPhaimui
  };

  console.log("✅ Tư thế chuẩn đã lưu:", TuTheDung);
}
function goc(a,b,c) {
    vectorBA= {x: a.x - b.x, y: a.y - b.y};
    vectorBC= {x: c.x - b.x, y: c.y - b.y};
    dodaiBA= Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    dodaiBC= Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);
    return Math.acos((vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y) / (dodaiBA * dodaiBC)) * (180 / Math.PI);
}

let currentKeypoints = null; // biến toàn cục lưu keypoints hiện tại
document.getElementById("nutbatdaucam").onclick = () => {
  if (poses.length > 0) {
    LuuTuTheDung(poses[0].keypoints);
    currentKeypoints = poses[0].keypoints;
    console.log("Đã lưu tư thế đúng");
  } else {
    console.log("❌ Chưa có dữ liệu keypoints từ camera");
  }
};
