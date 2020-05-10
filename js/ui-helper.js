var socket = io();


// element selectors
const sourceVideo = document.querySelector('video');
const drawCanvas = document.querySelector('#drawCanvas');
const streamCanvas = document.querySelector('#streamCanvas');

// canvas setup
const drawCtx = drawCanvas.getContext('2d');
const streamCtx = streamCanvas.getContext('2d');

// Model control buttons
// const fastButton = document.querySelector('button#highSpeed');
// const normalButton = document.querySelector('button#normalSpeed');
// const slowerButton = document.querySelector('button#lowerSpeed');
// const slowButton = document.querySelector('button#lowSpeed');


// Get video camera
function handleSuccess(stream) {
    const video = document.querySelector('video');
    console.log(`Using video device: ${stream.getVideoTracks()[0].label}`);
    video.srcObject = stream;
}

function handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
        console.error(`The resolution requested is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
        console.error("User denied access to media devices");
    }
    console.error(`getUserMedia error: ${error.name}`, error);
}
    navigator.mediaDevices.getUserMedia({video: {width: 640, height: 480}})
        .then(handleSuccess)
        .catch(handleError)

// Initialize the dashboard
function enableDashboard(initial=false) {

    drawCanvas.style.display = "block";
    userMessage.innerText = "Monitor running";
    // showStats.hidden = false;

    // startTime = new Date().getTime();

    // if(initial){
    //     fastButton.disabled = false;
    //     normalButton.disabled = false;
    //     slowerButton.disabled = false;
    //     slowButton.disabled = false;
    // }

    firstRun = false;
}