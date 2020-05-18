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
let aspect;
const pixelCellWidth = 14.0;
var videoStream = drawCanvas.captureStream();
var mediaRecorder = new MediaRecorder(videoStream, 30);
var chunks = [];

// check if metadata is ready - we need the sourceVideo size
sourceVideo.onloadedmetadata = () => {
    // console.log("video metadata ready");
    gotMetadata = true;
    if (isPlaying)
        load()
};

// Check if the sourceVideo has started playing
sourceVideo.onplaying = () => {
    // console.log("video playing");
    isPlaying = true;
    if (gotMetadata) {
        load()
    }
};

function load(multiplier=0.75, stride=8) {
    // t0 = performance.now();

    sourceVideo.width = sourceVideo.videoWidth;
    sourceVideo.height = sourceVideo.videoHeight;
    // console.log("video width: "+sourceVideo.videoWidth);
    // console.log("video height: "+sourceVideo.videoHeight);

    // Canvas results for displaying masks
    offscreenCanvas.width = sourceVideo.videoWidth;
    offscreenCanvas.height = sourceVideo.videoHeight;
    aspect = sourceVideo.videoWidth/sourceVideo.videoHeight;

    fitCanvasesToScreen();
    window.onresize = fitCanvasesToScreen();

    userMessage.innerText = "Loading model...";

    // console.log(`loading BodyPix with multiplier ${multiplier} and stride ${stride}`);

    v.overlayOpacity = 0.3;

// takes abut 3 seconds to do
    bodyPix.load({multiplier: multiplier, stride: stride, quantBytes: 4})
        .then(net => loop(net))
        .catch(err => console.error(err));

    // t1 = performance.now();
    // console.log("time to load:"+(t1-t0));

       
}

async function loop(net) {
    // let skipCount = 0;
    let skip = false;

    stopLoop = false;

    enableDashboard(firstRun); // Show the dashboard

    makeGrid(pixelCellWidth);
    
    // BodyPix setup
    const segmentPersonConfig = {
        flipHorizontal: flipHorizontal,     // Flip for webcam
        maxDetections: 1,                   // only look at one person in this model
        scoreThreshold: 0.6,
        internalResolution: 'high',
        segmentationThreshold: 0.5,         // default is 0.7
    };

    while (isPlaying && !stopLoop) {
        // skipCount++;
        // if(skipCount < 2) {
        //     console.log('skipped')
        //     continue;
        // }
        // else {
        //     skipCount = 0;
        // }

        skip = !skip;
        // var t0 = performance.now()

        // const segmentation = await net.segmentPerson(sourceVideo, segmentPersonConfig);
        const segmentation = await net.segmentPersonParts(sourceVideo, segmentPersonConfig);

        // draw(segmentation);

        const coloredImage = await bodyPix.toColoredPartMask(segmentation, colorScheme)
        drawPixelMask(coloredImage);


        if(recording) {
            let m = matchPix();
            scores.push(m);
        }

        if (live && !skip) {
                socket.emit('seg-stream', miniCanvas.toDataURL('image/webp', 1));
        }

        // skip if nothing is there
        if (segmentation.allPoses[0] === undefined) {
            continue;
        }
    }
}


// Use the bodyPix draw API's
function draw(segData) {
    // const coloredImage = toMask(segData, myColor);
    coloredImage = bodyPix.toColoredPartMask(segData, colorScheme)
    // drawMask(coloredImage);
    drawPixelMask(coloredImage);

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

// function matchPix() {
//     const w = drawCanvas.width;
//     const h = drawCanvas.height;

//     // not sure why this is neccessary?? But it seems like it is.
//     streamCanvas.width = w;
//     streamCanvas.height = h;
    
//     const myImg = drawCtx.getImageData(0, 0, w, h);

//     let streamImg = document.getElementById('streamImg');
//     streamCtx.drawImage(streamImg, 0, 0);
//     const poseFrame = streamCtx.getImageData(0, 0, w, h);
    
//     const diffCanvas = document.querySelector('#diffCanvas');
//     const diffCtx = diffCanvas.getContext('2d');
//     const diff = diffCtx.createImageData(w, h);

//     const thresh = 0.2;
//     dPix = pixelmatch(myImg.data, poseFrame.data, diff.data, w, h, {threshold: thresh});
//     diffCtx.putImageData(diff, 0, 0);

//     // counts how many pixels are part of a person
//     const d = Uint8ClampedArray.from(poseFrame.data);
    
//     //this actually takes a while maybe it could be async?
//     let c = 0;
//     for(let i = 3; i < d.length; i += 4) {
//         if (d[i]!=0) {
//             c++;
//         }
//     } 

//     return 100*(1-((dPix/2)/c))
// }

// run a comparison of the two canvases
// socket.on('match', () => {

//     const ptg = matchPix();

//     const ptgStr = (ptg).toString().substr(0,4);

//     // userMessage.innerText = "pct match: "+ptgStr+"%";

//     socket.emit('match-result', ptg);
    
// });

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
    a: 100
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


function drawMask(maskImage) {
    //somehow this width/height stuff clears the canvas.
    drawCanvas.width = drawCanvas.width;
    drawCanvas.height = drawCanvas.height;
    
    offCtx.putImageData(maskImage,0,0);
    
    drawCtx.save();
    // drawCtx.scale(2, 2);
    drawCtx.scale(-1, 1);
    drawCtx.translate(-drawCanvas.width, 0);
    drawCtx.drawImage(offscreenCanvas, 0, 0);
    drawCtx.restore();
    drawCtx.globalAlpha = 0.5;

}

function makeGrid(pixelCellWidth) {
    gridCanvas.width = drawCanvas.width;
    gridCanvas.height = drawCanvas.height;
    gridCtx.globalAlpha = 0.8;
    // Draws vertical grid lines that are `pixelCellWidth` apart from each other.
    for (let i = 0; i < drawCanvas.width; i++) {
    gridCtx.beginPath();
    gridCtx.strokeStyle = '#ffffff';
    gridCtx.moveTo(pixelCellWidth * i, 0);
    gridCtx.lineTo(pixelCellWidth * i, drawCanvas.height);
    gridCtx.stroke();
    }

    // Draws horizontal grid lines that are `pixelCellWidth` apart from each
    // other.
    for (let i = 0; i < drawCanvas.height; i++) {
    gridCtx.beginPath();
    gridCtx.strokeStyle = '#ffffff';
    gridCtx.moveTo(0, pixelCellWidth * i);
    gridCtx.lineTo(drawCanvas.width, pixelCellWidth * i);
    gridCtx.stroke();
    }
}

function project(source, canvas) {
    canvas.width = canvas.width;
    canvas.height = canvas.height;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // ctx.save();
    // ctx.scale(2, 2);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    ctx.drawImage(
        source, 0, 0, source.width, source.height, 0,
        0, canvas.width, canvas.height);

    // ctx.restore();
}

function drawPixelMask(maskImage) {
    //somehow this width/height stuff clears the canvas.
    offCtx.putImageData(maskImage,0,0);

    miniCanvas.width = drawCanvas.width * (1.0 / pixelCellWidth);
    miniCanvas.height = drawCanvas.height * (1.0 / pixelCellWidth);
    miniCtx.drawImage(
    offscreenCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height, 0, 0,
    miniCanvas.width, miniCanvas.height);

    project(miniCanvas, drawCanvas)
}

// function broadcast(live) {
//     if (live) {
//         socket.emit('seg-stream', miniCanvas.toDataURL('image/webp', 0.1));
//         setTimeout(function () {broadcast(live)}, 33);
//     }
// }

// broadcast(live);
function playVid(video) {
    drawCanvas.style.display = "none";
    video.style.display = "block";
// some kind of info screen
    video.play();
};

mediaRecorder.ondataavailable = function(e) {
    display.innerText = "STOPPED";
    chunks.push(e.data);
    // console.log("RECORDIN")
};

mediaRecorder.onstart = function() {
    display.innerText = "RECORDING";

    console.log("MEDIA RECORDER STARTED");
}



