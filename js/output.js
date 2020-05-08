var canvas = document.querySelector('#myCanvas');
// Optional frames per second argument.
var canvasStream = canvas.captureStream(25);
// Set the source of the <video> element to be the stream from the <canvas>.
//video.srcObject = stream;
console.log("whaddup");

// should be able to use this captured stream as a mediastream sent via RTC?