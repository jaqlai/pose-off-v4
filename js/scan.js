// Canvas setup


// Global flags
const flipHorizontal = true;
let stopLoop = false;
let isPlaying = false,
gotMetadata = false;
let firstRun = true;
let thisRoom;
let scores = [];
let recording = false;
let totalScore = 0;
let live=true;


const warm = [
    [110, 64, 170], [106, 72, 183], [100, 81, 196], [92, 91, 206],
    [84, 101, 214], [75, 113, 221], [66, 125, 224], [56, 138, 226],
    [48, 150, 224], [40, 163, 220], [33, 176, 214], [29, 188, 205],
    [26, 199, 194], [26, 210, 182], [28, 219, 169], [33, 227, 155],
    [41, 234, 141], [51, 240, 128], [64, 243, 116], [79, 246, 105],
    [96, 247, 97],  [115, 246, 91], [134, 245, 88], [155, 243, 88]
  ];

  const warmColors = [
    [110, 64, 170], [106, 72, 183], [100, 81, 196], [92, 91, 206],
    [84, 101, 214], [75, 113, 221], [66, 125, 224], [56, 138, 226],
    [48, 150, 224], [40, 163, 220], [33, 176, 214], [29, 188, 205],
    [26, 199, 194], [26, 210, 182], [28, 219, 169], [33, 227, 155],
    [41, 234, 141], [51, 240, 128], [64, 243, 116], [79, 246, 105],
    [96, 247, 97],  [115, 246, 91], [134, 245, 88], [155, 243, 88]
  ];

// check if metadata is ready - we need the sourceVideo size
sourceVideo.onloadedmetadata = () => {
    console.log("video metadata ready");
    gotMetadata = true;
    if (isPlaying)
        load()
};

// Check if the sourceVideo has started playing
sourceVideo.onplaying = () => {
    console.log("video playing");
    isPlaying = true;
    if (gotMetadata) {
        load()
    }
};

function load(multiplier=0.75, stride=8) {
    sourceVideo.width = sourceVideo.videoWidth;
    sourceVideo.height = sourceVideo.videoHeight;
    console.log("video width: "+sourceVideo.videoWidth);
    console.log("video height: "+sourceVideo.videoHeight);

    // Canvas results for displaying masks
    drawCanvas.width = sourceVideo.videoWidth;
    drawCanvas.height = sourceVideo.videoHeight;

    streamCanvas.width = drawCanvas.width;
    streamCanvas.height = drawCanvas.height;

    userMessage.innerText = "Loading model...";

    console.log(`loading BodyPix with multiplier ${multiplier} and stride ${stride}`);

    bodyPix.load({multiplier: multiplier, stride: stride, quantBytes: 4})
        .then(net => loop(net))
        .catch(err => console.error(err));
}

async function loop(net) {

    stopLoop = false;

    enableDashboard(firstRun); // Show the dashboard

    while (isPlaying && !stopLoop) {

        // BodyPix setup
        const segmentPersonConfig = {
            flipHorizontal: flipHorizontal,     // Flip for webcam
            maxDetections: 1,                   // only look at one person in this model
            scoreThreshold: 0.6,
            internalResolution: 'high',
            segmentationThreshold: 0.5,         // default is 0.7
        };
        const segmentation = await net.segmentPerson(sourceVideo, segmentPersonConfig);

        // use this code to segment by parts (also have to change coloredImage below)
        // const segmentation = await net.segmentPersonParts(sourceVideo, segmentPersonConfig);

        // skip if nothing is there
        if (segmentation.allPoses[0] === undefined) {
            // console.info("No segmentation data");
            continue;
        }

        // Draw the data to canvas
        draw(segmentation.data, drawCanvas);

        if(recording) {
            let m = matchPix();
            scores.push(m);
        }

        if(live) {
        // might have to have a png option for non-chrome?
        socket.emit('seg-stream', drawCanvas.toDataURL('image/webp', 0.1));
        }

        // if(live) {
        //     // might have to have a png option for non-chrome?
        //     socket.emit('seg-stream', segmentation.data);
        // }
        // console.log(roughObjSize = JSON.stringify(segmentation.data).length);
        // console.log(roughObjSize = JSON.stringify(drawCanvas.toDataURL('image/webp', 0.01)).length);
        // console.log("-------");

        // socket.on('seg-stream', (segData)=> {
        //     console.log(segData.width);
        //     draw(segData, streamCanvas);
        // });

    }

}



// Use the bodyPix draw API's
function draw(segData, canvas) {

    const myColor = {r: 0, g: 255, b: 0, a: 100};
    
    const coloredImage = toMask(segData, myColor);

    const opacity = 0.5;
    // const maskBlurAmount = 0;
    // change the second drawcanvas to sourceVideo to overlay on video stream
    // bodyPix.drawMask(
    //     canvas, canvas, coloredImage, opacity, maskBlurAmount,
    //     flipHorizontal);
    drawMask(canvas, coloredImage, opacity, 640, 480);

}

// Draw dots
function drawKeypoints(keypoints, minConfidence, ctx, color = 'aqua') {
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];

        if (keypoint.score < minConfidence) {
            continue;
        }

        const {y, x} = keypoint.position;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

    }
}

// Helper function to convert an array into a matrix for easier pixel proximity functions
function arrayToMatrix(arr, rowLength) {
    let newArray = [];

    // Check
    if (arr.length % rowLength > 0 || rowLength < 1) {
        console.log("array not divisible by rowLength ", arr, rowLength);
        return
    }

    let rows = arr.length / rowLength;
    for (let x = 0; x < rows; x++) {
        let b = arr.slice(x * rowLength, x * rowLength + rowLength);
        newArray.push(b);
    }
    return newArray;
}

function matchPix() {
    const w = drawCanvas.width;
    const h = drawCanvas.height;

    // not sure why this is neccessary?? But it seems like it is.
    streamCanvas.width = w;
    streamCanvas.height = h;
    
    const myImg = drawCtx.getImageData(0, 0, w, h);

    let streamImg = document.getElementById('streamImg');
    streamCtx.drawImage(streamImg, 0, 0);
    const poseFrame = streamCtx.getImageData(0, 0, w, h);
    
    const diffCanvas = document.querySelector('#diffCanvas');
    const diffCtx = diffCanvas.getContext('2d');
    const diff = diffCtx.createImageData(w, h);

    const thresh = 0.1
    dPix = pixelmatch(myImg.data, poseFrame.data, diff.data, w, h, {threshold: thresh});
    diffCtx.putImageData(diff, 0, 0);

    // counts how many pixels are part of a person
    const d = Uint8ClampedArray.from(poseFrame.data);
    
    //this actually takes a while maybe it could be async?
    let c = 0;
    for(let i = 3; i < d.length; i += 4) {
        if (d[i]!=0) {
            c++;
        }
    } 

    return 100*(1-((dPix/2)/c))
}

// run a comparison of the two canvases
socket.on('match', () => {

    const ptg = matchPix();

    const ptgStr = (ptg).toString().substr(0,4);

    // userMessage.innerText = "pct match: "+ptgStr+"%";

    socket.emit('match-result', ptg);
    
});

function checkScore(ms) {
    let avg = 0;
    recording = false;
    // console.log(scores);
    scores.forEach(function(pct){
        
        avg+=pct;
    });
    avg /= scores.length;
    console.log("Average Accuracy of "+avg+"% over "+(ms/3000)+" seconds!");
    const s = Math.round(avg*(ms/1000));
    addScore(s);
}

function addScore(s) {
    userMessage.innerText = "Added "+s+" pts!"
    totalScore += s;
}

function toMask(segData, clr = {
    r: 0,
    g: 255,
    b: 0,
    a: 255
}, width = 640, height = 480, foregroundIds = [1]) {
    if (Array.isArray(segData) &&
        segData.length === 0) {
        return null;
    }
    const bytes = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < height; i += 1) {
        for (let j = 0; j < width; j += 1) {
            const n = i * width + j;
            bytes[4 * n + 0] = 0;
            bytes[4 * n + 1] = 0;
            bytes[4 * n + 2] = 0;
            bytes[4 * n + 3] = 0;
            if (foregroundIds.some(id => id === segData[n])) {
                bytes[4 * n] = clr.r;
                bytes[4 * n + 1] = clr.g;
                bytes[4 * n + 2] = clr.b;
                bytes[4 * n + 3] = clr.a;
            }
        }
    }
    return new ImageData(bytes, width, height);
}

function flipCanvasHorizontal(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
}

function drawMask(canvas, maskImage, maskOpacity = 0.7, width, height) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.save();
    flipCanvasHorizontal(canvas);
    // ctx.drawImage(image, 0, 0);
    ctx.globalAlpha = maskOpacity;
    if (maskImage) {
        // assertSameDimensions({width, height}, maskImage, 'image', 'mask');
        // const mask = renderImageDataToOffScreenCanvas(maskImage, 'mask');
        // ctx.drawImage(mask, 0, 0, width, height);
        ctx.putImageData(maskImage, 0, 0);
    }
    ctx.restore();
}

function usrMsg(msg) {
    document.getElementById("overlay").style.opacity = 0.5;
}