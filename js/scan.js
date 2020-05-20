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
var videoStream = drawCanvas.captureStream(30);
var mediaRecorder = new MediaRecorder(videoStream);
var chunks = [];
let maskBack = 0;

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
        let loopT0 = performance.now()
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

        // const coloredImage = await bodyPix.toColoredPartMask(segmentation, colorScheme)
        const coloredImage = await toColoredPartMask(segmentation, colorScheme)

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
        let loopT1 = performance.now()
        if (!skip) {
            document.getElementById("fps").innerHTML = Math.round(1000/(loopT1-loopT0))+" fps";
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

// function toMask(segData, clr = {
//     r: 0,
//     g: 255,
//     b: 0,
//     a: 100
// }, width = 640, height = 480, foregroundIds = [1]) {
//     if (Array.isArray(segData) &&
//         segData.length === 0) {
//         return null;
//     }
//     const bytes = new Uint8ClampedArray(width * height * 4);
//     for (let i = 0; i < height; i += 1) {
//         for (let j = 0; j < width; j += 1) {
//             const n = i * width + j;
//             bytes[4 * n + 0] = 0;
//             bytes[4 * n + 1] = 0;
//             bytes[4 * n + 2] = 0;
//             bytes[4 * n + 3] = 0;
//             if (foregroundIds.some(id => id === segData[n])) {
//                 bytes[4 * n] = clr.r;
//                 bytes[4 * n + 1] = clr.g;
//                 bytes[4 * n + 2] = clr.b;
//                 bytes[4 * n + 3] = clr.a;
//             }
//         }
//     }
//     return new ImageData(bytes, width, height);
// }


// function drawMask(maskImage) {
//     //somehow this width/height stuff clears the canvas.
//     drawCanvas.width = drawCanvas.width;
//     drawCanvas.height = drawCanvas.height;
    
//     offCtx.putImageData(maskImage,0,0);
    
//     drawCtx.save();
//     // drawCtx.scale(2, 2);
//     drawCtx.scale(-1, 1);
//     drawCtx.translate(-drawCanvas.width, 0);
//     drawCtx.drawImage(offscreenCanvas, 0, 0);
//     drawCtx.restore();
//     drawCtx.globalAlpha = 0.5;

// }

function makeGrid(pixelCellWidth) {
    gridCanvas.width = drawCanvas.width;
    gridCanvas.height = drawCanvas.height;
    gridCtx.globalAlpha = 0.3;
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



function toColoredPartMask(partSegmentation, partColors) {
    if (Array.isArray(partSegmentation) && partSegmentation.length === 0) {
        return null;
    }
    let multiPersonPartSegmentation;
    if (!Array.isArray(partSegmentation)) {
        multiPersonPartSegmentation = [partSegmentation];
    }
    else {
        multiPersonPartSegmentation = partSegmentation;
    }
    const { width, height } = multiPersonPartSegmentation[0];
    const bytes = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < height * width; ++i) {
        // invert mask.  Invert the segmentation mask.
        const j = i * 4;
        bytes[j + 0] = maskBack;
        bytes[j + 1] = maskBack;
        bytes[j + 2] = maskBack;
        bytes[j + 3] = maskBack;
        for (let k = 0; k < multiPersonPartSegmentation.length; k++) {
            const partId = multiPersonPartSegmentation[k].data[i];
            if (partId !== -1) {
                const color = partColors[partId];
                if (!color) {
                    throw new Error(`No color could be found for part id ${partId}`);
                }
                bytes[j + 0] = color[0];
                bytes[j + 1] = color[1];
                bytes[j + 2] = color[2];
                bytes[j + 3] = 255;
            }
        }
    }
    return new ImageData(bytes, width, height);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// somehow the first run of this is much lower than the next runs
// something's going on where dPix returns as 0 over the first run. Not sure if it has smt to do w the video or the canvases or imagedata or what
function matchVids() {
    let fps = 5;
    let frameCount = fps*Math.min(streamVideo.duration, drawVideo.duration);
    console.log("frame count: "+frameCount)
    let inc = 1/fps;

    // const w = drawCanvas.width;
    // const h = drawCanvas.height;

    diffCanvas.width = drawCanvas.width * (1.0 / pixelCellWidth);
    diffCanvas.width = drawCanvas.width * (1.0 / pixelCellWidth);

    const w = diffCanvas.width;
    const h = diffCanvas.height;

    streamCanvas.width = w;
    streamCanvas.height = h;

    let avg = 0;

    for (let f = 0; f < frameCount; f++) {
        drawVideo.currentTime = f*inc;
        streamVideo.currentTime = f*inc;

        // drawCtx.drawImage(drawVideo, 0, 0, drawCanvas.width, drawCanvas.height);
        // streamCtx.drawImage(streamVideo, 0, 0, drawCanvas.width, drawCanvas.height);

        // const drawFrame = drawCtx.getImageData(0, 0, w, h);
        // const streamFrame = streamCtx.getImageData(0, 0, w, h);

        diffCtx.drawImage(drawVideo, 0, 0, diffCanvas.width, diffCanvas.height)
        let drawFrame = diffCtx.getImageData(0, 0, w, h).data;
        let c = countPersonPix(drawFrame);

        diffCtx.drawImage(streamVideo, 0, 0, diffCanvas.width, diffCanvas.height)
        let streamFrame = diffCtx.getImageData(0, 0, w, h).data;
        let d = countPersonPix(streamFrame);

        console.log("COUNT DRAW: "+c)
        console.log("COUNT STREAM: "+d)
        console.log("COUNT DIFF: "+(c-d))
        
        const thresh = 0.2;
        odPix = pixelmatch(drawFrame, streamFrame, w, h, {threshold: thresh});
        dPix = matchPix(drawFrame, streamFrame);
        console.log("METHOD DIFF: "+(odPix-dPix))
        console.log("MY METHOD: "+dPix);
        avg += dPix/c

    }
    // avg is the average percent difference.
    avg /= frameCount;
    console.log(1-avg);
}
function countPersonPix(frame) {

    // counts how many pixels are part of a person

        const d = Uint8ClampedArray.from(frame);

        //this actually takes a while maybe it could be async?
        let c = 0;
        for(let i = 0; i < d.length; i += 4) {
            let sum = d[i]+d[i+1]+d[i+2];
            if ((sum!= 0) && (sum<760)) {
                c++;
            }
        } 

    return c;
}
function matchPix(data1, data2) {

    // counts how many pixels are part of a person

        const a1 = Uint8ClampedArray.from(data1);
        const a2 = Uint8ClampedArray.from(data2);
        //this actually takes a while maybe it could be async?
        let c = 0;
        for(let i = 0; i < a1.length; i += 4) {
            
            let sum1 = a1[i]+a1[i+1]+a1[i+2];
            let notWhite1 = ((sum1!= 0) && (sum1<760))
            
            let sum2 = a2[i]+a2[i+1]+a2[i+2];
            let notWhite2 = ((sum2!= 0) && (sum2<760))

            if (notWhite1 && notWhite2) {
                c++;
            }
        } 

    return c;
}

// function matchPix() {


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

//         const d = Uint8ClampedArray.from(poseFrame.data);

//         //this actually takes a while maybe it could be async?
//         let c = 0;
//         for(let i = 3; i < d.length; i += 4) {
//             if (d[i]!=0) {
//                 c++;
//             }
//         } 

//     return 100*(1-((dPix/2)/c))
// }


//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF
//   TEST STUFF

  function pixelmatch(img1, img2, width, height, options) {

    if (!isPixelData(img1) || !isPixelData(img2))
        throw new Error('Image data: Uint8Array, Uint8ClampedArray or Buffer expected.');

    if (img1.length !== img2.length)
        throw new Error('Image sizes do not match.');

    if (img1.length !== width * height * 4) throw new Error('Image data size does not match width/height.');

    options = Object.assign({}, defaultOptions = {
        threshold: 0.1,         // matching threshold (0 to 1); smaller is more sensitive
        includeAA: false,       // whether to skip anti-aliasing detection
        alpha: 0.1,             // opacity of original image in diff ouput
        aaColor: [255, 255, 0], // color of anti-aliased pixels in diff output
        diffColor: [255, 0, 0], // color of different pixels in diff output
        diffColorAlt: null,     // whether to detect dark on light differences between img1 and img2 and set an alternative color to differentiate between the two
        diffMask: false         // draw the diff over a transparent background (a mask)
    }, options);

    // // check if images are identical
    // const len = width * height;
    // const a32 = new Uint32Array(img1.buffer, img1.byteOffset, len);
    // const b32 = new Uint32Array(img2.buffer, img2.byteOffset, len);
    // let identical = true;

    // for (let i = 0; i < len; i++) {
    //     if (a32[i] !== b32[i]) { identical = false; break; }
    // }

    // if (identical) { // fast path if identical
    //     if (output && !options.diffMask) {
    //         for (let i = 0; i < len; i++) drawGrayPixel(img1, 4 * i, options.alpha, output);
    //     }
    //     return 0;
    // }

    // maximum acceptable square distance between two colors;

    // 35215 is the maximum possible value for the YIQ difference metric
    const maxDelta = 35215 * options.threshold * options.threshold;
    let diff = 0;

    // compare each pixel of one image against the other one
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const pos = (y * width + x) * 4;

            // squared YUV distance between colors at this pixel position, negative if the img2 pixel is darker
            const delta = colorDelta(img1, img2, pos, pos);

            // the color difference is above the threshold
            if (Math.abs(delta) > maxDelta) {
                // check it's a real rendering difference or just anti-aliasing
                if (!options.includeAA && (antialiased(img1, x, y, width, height, img2) ||
                                           antialiased(img2, x, y, width, height, img1))) {
                    // one of the pixels is anti-aliasing; draw as yellow and do not count as difference
                    // note that we do not include such pixels in a mask
                    // if (output && !options.diffMask) drawPixel(output, pos, ...options.aaColor);

                } else {
                    // found substantial difference not caused by anti-aliasing; draw it as such
                    // if (output) {
                    //     drawPixel(output, pos, ...(delta < 0 && options.diffColorAlt || options.diffColor));
                    // }
                    diff++;
                }

            }
        }
    }

    // return the number of different pixels
    return diff;
}

function isPixelData(arr) {
    // work around instanceof Uint8Array not working properly in some Jest environments
    return ArrayBuffer.isView(arr) && arr.constructor.BYTES_PER_ELEMENT === 1;
}

// check if a pixel is likely a part of anti-aliasing;
// based on "Anti-aliased Pixel and Intensity Slope Detector" paper by V. Vysniauskas, 2009

function antialiased(img, x1, y1, width, height, img2) {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const pos = (y1 * width + x1) * 4;
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    let min = 0;
    let max = 0;
    let minX, minY, maxX, maxY;

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;

            // brightness delta between the center pixel and adjacent one
            const delta = colorDelta(img, img, pos, (y * width + x) * 4, true);

            // count the number of equal, darker and brighter adjacent pixels
            if (delta === 0) {
                zeroes++;
                // if found more than 2 equal siblings, it's definitely not anti-aliasing
                if (zeroes > 2) return false;

            // remember the darkest pixel
            } else if (delta < min) {
                min = delta;
                minX = x;
                minY = y;

            // remember the brightest pixel
            } else if (delta > max) {
                max = delta;
                maxX = x;
                maxY = y;
            }
        }
    }

    // if there are no both darker and brighter pixels among siblings, it's not anti-aliasing
    if (min === 0 || max === 0) return false;

    // if either the darkest or the brightest pixel has 3+ equal siblings in both images
    // (definitely not anti-aliased), this pixel is anti-aliased
    return (hasManySiblings(img, minX, minY, width, height) && hasManySiblings(img2, minX, minY, width, height)) ||
           (hasManySiblings(img, maxX, maxY, width, height) && hasManySiblings(img2, maxX, maxY, width, height));
}

// check if a pixel has 3+ adjacent pixels of the same color.
function hasManySiblings(img, x1, y1, width, height) {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const pos = (y1 * width + x1) * 4;
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;

            const pos2 = (y * width + x) * 4;
            if (img[pos] === img[pos2] &&
                img[pos + 1] === img[pos2 + 1] &&
                img[pos + 2] === img[pos2 + 2] &&
                img[pos + 3] === img[pos2 + 3]) zeroes++;

            if (zeroes > 2) return true;
        }
    }

    return false;
}

// calculate color difference according to the paper "Measuring perceived color difference
// using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos

function colorDelta(img1, img2, k, m, yOnly) {
    let r1 = img1[k + 0];
    let g1 = img1[k + 1];
    let b1 = img1[k + 2];
    let a1 = img1[k + 3];

    let r2 = img2[m + 0];
    let g2 = img2[m + 1];
    let b2 = img2[m + 2];
    let a2 = img2[m + 3];

    if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) return 0;

    if (a1 < 255) {
        a1 /= 255;
        r1 = blend(r1, a1);
        g1 = blend(g1, a1);
        b1 = blend(b1, a1);
    }

    if (a2 < 255) {
        a2 /= 255;
        r2 = blend(r2, a2);
        g2 = blend(g2, a2);
        b2 = blend(b2, a2);
    }

    const y1 = rgb2y(r1, g1, b1);
    const y2 = rgb2y(r2, g2, b2);
    const y = y1 - y2;

    if (yOnly) return y; // brightness difference only

    const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
    const q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);

    const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;

    // encode whether the pixel lightens or darkens in the sign
    return y1 > y2 ? -delta : delta;
}

function rgb2y(r, g, b) { return r * 0.29889531 + g * 0.58662247 + b * 0.11448223; }
function rgb2i(r, g, b) { return r * 0.59597799 - g * 0.27417610 - b * 0.32180189; }
function rgb2q(r, g, b) { return r * 0.21147017 - g * 0.52261711 + b * 0.31114694; }

// blend semi-transparent color with white
function blend(c, a) {
    return 255 + (c - 255) * a;
}