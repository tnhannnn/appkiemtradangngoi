console.log("Kết nối JavaScript thành công");

let stream = null;
let isRunning = false;
let detector = null;
let poses = [];

document.addEventListener("DOMContentLoaded", async () => {
    const btn = document.getElementById("nutbatdaucam");
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    if (btn) btn.textContent = "Bật Camera";

    function resizeCanvas() {
        if (video && canvas) {
            canvas.width = video.videoWidth || window.innerWidth;
            canvas.height = video.videoHeight || window.innerHeight;
        }
    }

    // Khởi tạo pose detector
    async function initDetector() {
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        });
    }

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (video) {
                video.srcObject = stream;
                await video.play();
                resizeCanvas();
            }
            isRunning = true;
            if (btn) btn.textContent = "Tắt Camera";

            // khởi tạo detector nếu chưa có
            if (!detector) await initDetector();

            requestAnimationFrame(drawCanvas);
        } catch (err) {
            console.error("Không thể truy cập camera:", err);
            alert("Không thể truy cập camera. Hãy kiểm tra quyền truy cập!");
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (video) video.srcObject = null;
        isRunning = false;
        if (btn) btn.textContent = "Bật Camera";

        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    if (btn) {
        btn.onclick = () => {
            if (!isRunning) {
                startCamera();
            } else {
                stopCamera();
            }
        };
    }

    async function drawCanvas() {
        if (!isRunning) return;
        if (!ctx || !canvas || !video) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // dự đoán pose
        if (detector) {
            poses = await detector.estimatePoses(video);
            if (poses.length > 0) {
                const pose = poses[0];
                // vẽ keypoints
                for (const keypoint of pose.keypoints) {
                    if (keypoint.score > 0.5) {
                        ctx.fillStyle = "red";
                        ctx.beginPath();
                        ctx.arc(keypoint.x, keypoint.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // vẽ skeleton (nối các keypoints)
                const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
                ctx.strokeStyle = "lime";
                ctx.lineWidth = 2;
                for (const [i, j] of adjacentPairs) {
                    const kp1 = pose.keypoints[i];
                    const kp2 = pose.keypoints[j];
                    if (kp1.score > 0.5 && kp2.score > 0.5) {
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
