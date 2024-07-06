let currentStream;
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let switchCameraButton = document.getElementById('switch-camera');
let useFrontCamera = true;
let model;

async function setupCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: useFrontCamera ? 'user' : 'environment'
        }
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function detectObjects(video, model) {
    const ctx = canvas.getContext('2d');
    video.width = video.videoWidth;
    video.height = video.videoHeight;

    canvas.width = video.width;
    canvas.height = video.height;

    async function detect() {
        const predictions = await model.detect(video);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        predictions.forEach(prediction => {
            ctx.beginPath();
            ctx.rect(...prediction.bbox);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.fillStyle = 'red';
            ctx.stroke();
            ctx.fillText(
                `${prediction.class} (${(prediction.score * 100).toFixed(2)}%)`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );
        });

        requestAnimationFrame(detect);
    }

    detect();
}

async function main() {
    video = await setupCamera();
    video.play();

    model = await cocoSsd.load();
    detectObjects(video, model);
}

switchCameraButton.addEventListener('click', async () => {
    useFrontCamera = !useFrontCamera;
    await setupCamera();
    detectObjects(video, model);
});

main();
