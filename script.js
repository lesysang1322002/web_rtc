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

let lastSentTime = 0;  // ngoài hàm detectObjects

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
            ctx.font = '25px sans-serif';
            ctx.fillStyle = 'red';
            ctx.stroke();
            ctx.fillText(
                `${prediction.class} (${(prediction.score * 100).toFixed(2)}%)`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );

            // Send data to Bluetooth device
            const now = Date.now();
            if (now - lastSentTime >= 3000) {
                send(prediction.class);
                lastSentTime = now;
            }
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

const bleService = '0000ffe0-0000-1000-8000-00805f9b34fb';
const bleCharacteristic = '0000ffe1-0000-1000-8000-00805f9b34fb';
let gattCharacteristic;
let dev;

function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log('Web Bluetooth API is not available in this browser!');
        return false;
    }
    return true;
}

const button = document.getElementById("toggleButton");
button.addEventListener('click', toggleFunction);

function toggleFunction() {
    if (button.innerText === "Scan") {
        requestBluetoothDevice();
    } else {
        document.getElementById("buttonText").innerText = "Scan";
        disconnect();
        requestBluetoothDevice();
    }
}

function requestBluetoothDevice() {
    if (isWebBluetoothEnabled()) {
        logstatus('Finding...');
        navigator.bluetooth.requestDevice({
            filters: [{ services: [bleService] }]
        })
        .then(device => {
            dev = device;
            logstatus("Connect to " + dev.name);
            console.log('Đang kết nối với', dev);
            return device.gatt.connect();
        })
        .then(server => {
            console.log('Getting GATT Service...');
            logstatus('Getting Service...');
            return server.getPrimaryService(bleService);
        })
        .then(service => {
            console.log('Getting GATT Characteristic...');
            logstatus('Getting Characteristic...');
            return service.getCharacteristic(bleCharacteristic);
        })
        .then(characteristic => {
            logstatus(dev.name);
            document.getElementById("buttonText").innerText = "Rescan";
            gattCharacteristic = characteristic;
            return gattCharacteristic.startNotifications();
        })
        .catch(error => {
            if (error instanceof DOMException && error.name === 'NotFoundError' && error.message === 'User cancelled the requestDevice() chooser.') {
                console.log("Người dùng đã hủy yêu cầu kết nối thiết bị.");
                logstatus("Scan to connect");
            } else {
                console.log("Không thể kết nối với thiết bị: " + error);
                logstatus("ERROR");
            }
        });
    }
}

function disconnect() {
    if (dev && dev.gatt.connected) {
        logstatus("Scan to connect");
        console.log("Đã ngắt kết nối với: " + dev.name);
        dev.gatt.disconnect();
    }
}

async function send(data) {
    if (!gattCharacteristic) {
        console.log("GATT Characteristic not found.");
        return;
    }
    data += '\n';  // Append newline character to data
    console.log("You -> " + data);
    let start = 0;
    const dataLength = data.length;
    while (start < dataLength) {
        let subStr = data.substring(start, start + 16);
        try {
            await gattCharacteristic.writeValue(str2ab(subStr));
        } catch (error) {
            console.error("Error writing to characteristic:", error);
            break;
        }
        start += 16;
    }
}

function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function logstatus(text) {
    const navbarTitle = document.getElementById('navbarTitle');
    navbarTitle.textContent = text;
}

document.addEventListener('DOMContentLoaded', function () {
    const infoButton = document.getElementById('infoButton');
    const infoContent = document.getElementById('infoContent');

    infoButton.addEventListener('click', function (event) {
        event.stopPropagation(); // Ngăn chặn sự kiện click lan sang các phần tử cha
        if (infoContent.style.display === 'block') {
            infoContent.style.display = 'none';
        } else {
            infoContent.style.display = 'block';
        }
    });

    document.addEventListener('click', function () {
        infoContent.style.display = 'none';
    });
});
