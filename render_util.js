/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
// import {getInputSize} from './util';
const offScreenCanvases = {};
function isSafari() {
    return (/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
}
function assertSameDimensions({ width: widthA, height: heightA }, { width: widthB, height: heightB }, nameA, nameB) {
    if (widthA !== widthB || heightA !== heightB) {
        throw new Error(`error: dimensions must match. ${nameA} has dimensions ${widthA}x${heightA}, ${nameB} has dimensions ${widthB}x${heightB}`);
    }
}
function flipCanvasHorizontal(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
}
function drawWithCompositing(ctx, image, compositOperation) {
    ctx.globalCompositeOperation = compositOperation;
    ctx.drawImage(image, 0, 0);
}
function createOffScreenCanvas() {
    const offScreenCanvas = document.createElement('canvas');
    return offScreenCanvas;
}
function ensureOffscreenCanvasCreated(id) {
    if (!offScreenCanvases[id]) {
        offScreenCanvases[id] = createOffScreenCanvas();
    }
    return offScreenCanvases[id];
}
function renderImageToCanvas(image, canvas) {
    const { width, height } = image;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
}
/**
 * Draw an image on a canvas
 */
function renderImageDataToCanvas(image, canvas) {
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(image, 0, 0);
}
function renderImageDataToOffScreenCanvas(image, canvasName) {
    const canvas = ensureOffscreenCanvasCreated(canvasName);
    renderImageDataToCanvas(image, canvas);
    return canvas;
}
/**
 * Given the output from estimating multi-person segmentation, generates an
 * image with foreground and background color at each pixel determined by the
 * corresponding binary segmentation value at the pixel from the output.  In
 * other words, pixels where there is a person will be colored with foreground
 * color and where there is not a person will be colored with background color.
 *
 * @param personOrPartSegmentation The output from
 * `segmentPerson`, `segmentMultiPerson`,
 * `segmentPersonParts` or `segmentMultiPersonParts`. They can
 * be SemanticPersonSegmentation object, an array of PersonSegmentation object,
 * SemanticPartSegmentation object, or an array of PartSegmentation object.
 *
 * @param foreground Default to {r:0, g:0, b:0, a: 0}. The foreground color
 * (r,g,b,a) for visualizing pixels that belong to people.
 *
 * @param background Default to {r:0, g:0, b:0, a: 255}. The background color
 * (r,g,b,a) for visualizing pixels that don't belong to people.
 *
 * @param drawContour Default to false. Whether to draw the contour around each
 * person's segmentation mask or body part mask.
 *
 * @param foregroundIds Default to [1]. The integer values that represent
 * foreground. For person segmentation, 1 is the foreground. For body part
 * segmentation, it can be a subset of all body parts ids.
 *
 * @returns An ImageData with the same width and height of
 * all the PersonSegmentation in multiPersonSegmentation, with opacity and
 * transparency at each pixel determined by the corresponding binary
 * segmentation value at the pixel from the output.
 */
export function toMask(segData, clr = {
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
/**
 * Given an image and a maskImage of type ImageData, draws the image with the
 * mask on top of it onto a canvas.
 *
 * @param canvas The canvas to be drawn onto.
 *
 * @param image The original image to apply the mask to.
 *
 * @param maskImage An ImageData containing the mask.  Ideally this should be
 * generated by toMask or toColoredPartMask.
 *
 * @param maskOpacity The opacity of the mask when drawing it on top of the
 * image. Defaults to 0.7. Should be a float between 0 and 1.
 *
 * @param maskBlurAmount How many pixels to blur the mask by. Defaults to 0.
 * Should be an integer between 0 and 20.
 *
 * @param flipHorizontal If the result should be flipped horizontally.  Defaults
 * to false.
 */
export function drawMask(canvas, maskImage, maskOpacity = 0.7, width, height) {
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
