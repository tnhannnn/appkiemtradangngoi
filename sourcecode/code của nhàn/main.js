console.log("ket noi javascript thanh cong")
//camera
let stream = null; // khởi tạo stream để còn lấy video
let isRunning = false; // trạng thái video
document.getElementById("nutbatdaucam").textContent = "Bật Camera";// tự set trạng thái nút về bật lúc khởi động 
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById("webcam");
    video.srcObject = stream;
    await video.play();
    isRunning = true;
  } catch (err) {
    console.error("Không thể truy cập camera:", err);
  }
}

function stopCamera() {
  if (stream) {
    // nếu đang stream thì mới dừng
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  const video = document.getElementById("webcam");
  video.srcObject = null; // tháo stream ra khỏi video 
  isRunning = false; // đặt trạng thái video về chưa có 
}

document.getElementById("nutbatdaucam").onclick= () => {
  if (!isRunning) {// nếu video chưa bật thì bật video lên
    startCamera();
    document.getElementById("nutbatdaucam").textContent = "Tắt Camera";//chỉnh thông báo nút
  } else {
    stopCamera();// đang chạy r thì cứ tắt thôi 
    document.getElementById("nutbatdaucam").textContent = "Bật Camera";// chinhr lại thông báo nút
  }
};
