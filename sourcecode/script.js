const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

// Đảm bảo TensorFlow.js sử dụng WebGL backend để tăng tốc độ xử lý GPU
// Dòng này cần chạy TRƯỚC KHI bất kỳ lệnh TensorFlow.js nào khác.
tf.setBackend('webgl');

let detector; // Biến để lưu trữ mô hình PoseDetector

// --- Cấu hình cho việc vẽ keypoint ---
const defaultKeypointRadius = 4;
const defaultLineColor = 'rgb(255, 0, 0)'; // Màu đỏ cho xương
const defaultPointColor = 'rgb(0, 255, 0)'; // Màu xanh lá cho khớp

// Các cặp keypoint để vẽ đường nối (chỉ giữ lại đầu và vai)
// Dựa trên chỉ số keypoint của MoveNet:
// 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
// 5: left_shoulder, 6: right_shoulder
const connectedPartPairs = [
    [0, 1],   // Mũi -> Mắt trái
    [0, 2],   // Mũi -> Mắt phải
    [1, 3],   // Mắt trái -> Tai trái
    [2, 4],   // Mắt phải -> Tai phải
    [5, 6],   // Vai trái -> Vai phải
    [0, 5],   // Mũi -> Vai trái (có thể giúp hình dung hơn)
    [0, 6]    // Mũi -> Vai phải (có thể giúp hình dung hơn)
];

// --- Hàm khởi tạo camera và mô hình ---
async function setupCamera() {
    try {
        // Có thể giảm độ phân giải video để giảm tải xử lý nếu vẫn lag
        // Ví dụ: { width: 320, height: 240 } hoặc { width: 480, height: 360 }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    } catch (error) {
        console.error('Không thể truy cập camera:', error);
        statusDiv.textContent = 'Lỗi: Không thể truy cập camera. Vui lòng cấp quyền và tải lại trang.';
    }
}

async function loadModel() {
    statusDiv.textContent = 'Đang tải mô hình AI...';
    // Cấu hình mô hình MoveNet Lightning (tối ưu cho tốc độ)
    const modelConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    };
    // Tạo detector bằng API PoseDetection
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, modelConfig);
    statusDiv.textContent = 'Mô hình đã sẵn sàng!';
    console.log('Mô hình MoveNet (qua PoseDetection) đã tải.');
}

// --- Hàm vẽ keypoint và đường nối lên canvas ---
function drawKeypoints(keypoints) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa canvas cũ

    // Vẽ các đường nối
    connectedPartPairs.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];

        // Chỉ vẽ nếu cả hai keypoint có độ tin cậy cao
        if (kp1.score > 0.3 && kp2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.lineWidth = 2;
            ctx.strokeStyle = defaultLineColor;
            ctx.stroke();
        }
    });

    // Vẽ từng keypoint
    keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) { // Chỉ vẽ keypoint có độ tin cậy cao
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, defaultKeypointRadius, 0, 2 * Math.PI);
            ctx.fillStyle = defaultPointColor;
            ctx.fill();
        }
    });
}

// --- Hàm phân tích tư thế ---
function analyzePosture(keypoints) {
    // Keypoint indices for MoveNet:
    // 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
    // 5: left_shoulder, 6: right_shoulder

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const nose = keypoints[0];
    const leftEar = keypoints[3];
    const rightEar = keypoints[4];

    // Kiểm tra độ tin cậy của các keypoint cần thiết
    const requiredConfidence = 0.6; // Ngưỡng độ tin cậy tối thiểu, có thể điều chỉnh
    // Nếu một trong các keypoint quan trọng có độ tin cậy thấp, có thể người dùng chưa rõ ràng trong khung hình
    if (leftShoulder.score < requiredConfidence || rightShoulder.score < requiredConfidence ||
        nose.score < requiredConfidence || leftEar.score < requiredConfidence || rightEar.score < requiredConfidence) {
        statusDiv.textContent = 'Tư thế: Vui lòng vào giữa khung hình và đảm bảo đủ sáng!';
        statusDiv.classList.remove('bad-posture');
        return;
    }

    let isBadPosture = false;
    let feedback = "Tư thế: Tốt!";

    // --- Các quy tắc phát hiện tư thế sai ---
    // (Bạn cần thử nghiệm và điều chỉnh các ngưỡng số pixel này để phù hợp nhất với bản thân)

    // 1. Vai gù về phía trước (Slouching / Rounded shoulders)
    // So sánh vị trí X trung bình của vai với vị trí X trung bình của tai.
    // Vì hình ảnh bị lật (mirror), nếu vai gù về phía trước, điểm X của vai sẽ lớn hơn điểm X của tai.
    const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const avgEarX = (leftEar.x + rightEar.x) / 2;
    const shoulderForwardThreshold = 40; // Pixel: Vai lệch X so với tai bao nhiêu để bị coi là gù

    if (avgShoulderX > avgEarX + shoulderForwardThreshold) {
        isBadPosture = true;
        feedback = "Tư thế: Vai đang bị gù về phía trước!";
    }

    // 2. Vai nhô cao (Shrugged shoulders)
    // So sánh vị trí Y trung bình của vai với vị trí Y trung bình của tai.
    // Nếu vai bị nhô cao, điểm Y của vai sẽ nhỏ hơn điểm Y của tai (vì Y càng nhỏ là càng lên trên).
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgEarY = (leftEar.y + rightEar.y) / 2;
    const highShoulderThreshold = 20; // Pixel: Vai cao hơn tai bao nhiêu để bị coi là nhô cao

    if (avgShoulderY < avgEarY - highShoulderThreshold) {
        isBadPosture = true;
        feedback = "Tư thế: Vai đang bị nhô cao!";
    }

    // 3. Đầu rụt/cúi quá mức (Forward head posture / Head down)
    // So sánh vị trí Y của mũi với vị trí Y trung bình của vai.
    // Nếu đầu cúi thấp hoặc rụt về phía trước, điểm Y của mũi sẽ lớn hơn điểm Y của vai.
    const minShoulderY = Math.min(leftShoulder.y, rightShoulder.y); // Lấy vai cao hơn (số Y nhỏ hơn)
    const headDownThreshold = 50; // Pixel: Mũi thấp hơn vai bao nhiêu để bị coi là cúi

    if (nose.y > minShoulderY + headDownThreshold) {
         isBadPosture = true;
         feedback = "Tư thế: Đầu đang cúi quá thấp hoặc rụt cổ!";
    }

    // --- Tổng hợp và ưu tiên phản hồi ---
    const hasSlouching = feedback.includes("Vai đang bị gù");
    const hasHeadDown = feedback.includes("Đầu đang cúi");
    const hasHighShoulder = feedback.includes("Vai đang bị nhô cao");

    if (hasSlouching && hasHeadDown) {
        feedback = "Tư thế: Vai gù và đầu cúi quá mức!";
    } else if (hasSlouching) {
        feedback = "Tư thế: Vai đang bị gù về phía trước!";
    } else if (hasHeadDown) {
        feedback = "Tư thế: Đầu đang cúi quá thấp hoặc rụt cổ!";
    } else if (hasHighShoulder) {
        feedback = "Tư thế: Vai đang bị nhô cao!";
    }

    // Cập nhật trạng thái hiển thị trên giao diện
    statusDiv.textContent = feedback;
    if (isBadPosture) {
        statusDiv.classList.add('bad-posture'); // Thêm class CSS để đổi màu đỏ
    } else {
        statusDiv.classList.remove('bad-posture'); // Xóa class CSS để về màu xanh
    }
}

// --- Vòng lặp phát hiện tư thế liên tục ---
// Có thể thêm Frame Skipping để giảm lag nếu cần (xem phần hướng dẫn trước)
let frameCount = 0;
const processEveryNthFrame = 2; // Ví dụ: chỉ xử lý mỗi 2 khung hình để giảm tải

async function poseDetectionFrame() {
    if (!detector) { // Đảm bảo detector đã được tải
        requestAnimationFrame(poseDetectionFrame);
        return;
    }

    frameCount++;
    if (frameCount % processEveryNthFrame === 0) { // Chỉ xử lý mỗi N khung hình
        const poses = await detector.estimatePoses(video);

        if (poses.length > 0) {
            const person = poses[0]; // Lấy tư thế của người đầu tiên (chỉ phát hiện 1 người)
            drawKeypoints(person.keypoints);
            analyzePosture(person.keypoints);
        } else {
            // Nếu không phát hiện được người nào
            statusDiv.textContent = 'Tư thế: Không phát hiện được người. Vui lòng vào khung hình.';
            statusDiv.classList.remove('bad-posture');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa các điểm cũ trên canvas
        }
    } else {
        // Để tránh bị giật hình khi bỏ qua khung hình, chúng ta có thể vẽ lại keypoints cuối cùng
        // (Điều này yêu cầu lưu trữ keypoints cuối cùng và chỉnh sửa lại drawKeypoints)
        // Hiện tại, chúng ta chấp nhận việc không cập nhật canvas trong các khung hình bị bỏ qua.
    }

    requestAnimationFrame(poseDetectionFrame); // Lặp lại liên tục cho khung hình tiếp theo
}

// --- Khởi chạy ứng dụng ---
async function init() {
    await setupCamera(); // Khởi tạo camera
    await loadModel();   // Tải mô hình AI
    poseDetectionFrame(); // Bắt đầu vòng lặp phát hiện tư thế
}

init(); // Gọi hàm khởi tạo khi trang tải xong