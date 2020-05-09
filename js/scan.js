// Canvas setup
const drawCtx = drawCanvas.getContext('2d');
const streamCtx = streamCanvas.getContext('2d');

// Global flags
const flipHorizontal = true;
let stopLoop = false;
let isPlaying = false,
    gotMetadata = false;
let firstRun = true;

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

    // console.log("video width: "+sourceVideo.width);
    // console.log("video height: "+sourceVideo.height);

    // drawCanvas.width = sourceVideo.width;
    // drawCanvas.height = sourceVideo.height;


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
        draw(segmentation);

        // might have to have a png option for non-chrome?
        socket.emit('seg-stream', drawCanvas.toDataURL('image/webp'));

    }

}



// Use the bodyPix draw API's
function draw(personSegmentation) {

    // if (showMaskToggle.checked) {
    let targetSegmentation = personSegmentation;

    const foregroundColor = {r: 0, g: 255, b: 0, a: 100};
    const backgroundColor = {r: 0, g: 0, b: 0, a: 0};
    const coloredImage = bodyPix.toMask(targetSegmentation, foregroundColor, backgroundColor);
  
    // const coloredImage = bodyPix.toColoredPartMask(targetSegmentation, warm);
    const opacity = 0.5;
    const maskBlurAmount = 0;
    // change the second drawcanvas to sourceVideo to overlay on video stream
    bodyPix.drawMask(
        drawCanvas, drawCanvas, coloredImage, opacity, maskBlurAmount,
        flipHorizontal);

    // }

    // // drawMask clears the canvas, drawKeypoints doesn't
    // if (showMaskToggle.checked === false) {
    //     // bodyPix.drawMask redraws the canvas. Clear with not
    //     drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    // }

    // // Show dots from pose detection
    // if (showPointsToggle.checked) {
    //     personSegmentation.allPoses.forEach(pose => {
    //         if (flipHorizontal) {
    //             pose = bodyPix.flipPoseHorizontal(pose, personSegmentation.width);
    //         }
    //         drawKeypoints(pose.keypoints, 0.9, drawCtx);
    //     });
    // }

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

// run a comparison of the two canvases
socket.on('match', () => {
    console.log("matching ...");
    const w = drawCanvas.width;
    const h = drawCanvas.height;
    streamCanvas.width = w;
    streamCanvas.height = h;
    const myImg = drawCtx.getImageData(0, 0, w, h);

    let streamImg = document.getElementById('streamImg');
    streamCtx.drawImage(streamImg, 0, 0);
    const poseFrame = streamCtx.getImageData(0, 0, w, h);

    // console.log(myImg);
    
    const diffCanvas = document.querySelector('#diffCanvas');
    const diffCtx = diffCanvas.getContext('2d');
    const diff = diffCtx.createImageData(w, h);

    const thresh = 0.1
    dPix = pixelmatch(myImg.data, poseFrame.data, diff.data, w, h, {threshold: thresh});
    diffCtx.putImageData(diff, 0, 0);

    // console.log("unmatchedPix: "+dPix);

    // counts how many pixels are part of a person
    const d = Uint8ClampedArray.from(poseFrame.data);
    let c = 0;
    for(let i = 3; i < d.length; i += 4) {
        if (d[i]!=0) {
            c++;
        }
    } 

    // console.log("pct area: "+(c/(w*h)));
    // socket.emit('server-msg', a);
    // console.log(a);

    // take half the different pixels (imagine two people standing apart: the areas are counted twice) over the total area of the posing person.
    const ptg = (1-((dPix/2)/c));
    const ptgStr = (100*ptg).toString().substr(0,4);
    // console.log("threshold:"+thresh+" pct match: "+(1-ptg)+"%");

    userMessage.innerText = "pct match: "+ptgStr+"%";
    // userMessage.innerText = c > dPix;

    // diffContext.putImageData(diff, 0, 0);
});
