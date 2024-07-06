async function setupCamera() {
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function detectObjects(video, model) {
    const canvas = document.getElementById('canvas');
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
    const video = await setupCamera();
    video.play();

    const model = await cocoSsd.load();
    detectObjects(video, model);
}

main();
