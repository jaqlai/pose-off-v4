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

// import {cpuBlur} from './blur';
import {Color, PartSegmentation, PersonSegmentation} from './types';
import {SemanticPartSegmentation, SemanticPersonSegmentation} from './types';
// import {getInputSize} from './util';

const offScreenCanvases: {[name: string]: HTMLCanvasElement} = {};

type ImageType = HTMLImageElement|HTMLVideoElement|HTMLCanvasElement;
type HasDimensions = {
  width: number,
  height: number
};

function isSafari() {
  return (/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
}

function assertSameDimensions(
    {width: widthA, height: heightA}: HasDimensions,
    {width: widthB, height: heightB}: HasDimensions, nameA: string,
    nameB: string) {
  if (widthA !== widthB || heightA !== heightB) {
    throw new Error(`error: dimensions must match. ${nameA} has dimensions ${
        widthA}x${heightA}, ${nameB} has dimensions ${widthB}x${heightB}`);
  }
}

function flipCanvasHorizontal(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  ctx.scale(-1, 1);
  ctx.translate(-canvas.width, 0);
}

function drawWithCompositing(
    ctx: CanvasRenderingContext2D, image: HTMLCanvasElement|ImageType,
    compositOperation: string) {
  ctx.globalCompositeOperation = compositOperation;
  ctx.drawImage(image, 0, 0);
}

function createOffScreenCanvas(): HTMLCanvasElement {
  const offScreenCanvas = document.createElement('canvas');
  return offScreenCanvas;
}

function ensureOffscreenCanvasCreated(id: string): HTMLCanvasElement {
  if (!offScreenCanvases[id]) {
    offScreenCanvases[id] = createOffScreenCanvas();
  }
  return offScreenCanvases[id];
}


function renderImageToCanvas(image: ImageType, canvas: HTMLCanvasElement) {
  const {width, height} = image;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, width, height);
}
/**
 * Draw an image on a canvas
 */
function renderImageDataToCanvas(image: ImageData, canvas: HTMLCanvasElement) {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');

  ctx.putImageData(image, 0, 0);
}

function renderImageDataToOffScreenCanvas(
    image: ImageData, canvasName: string): HTMLCanvasElement {
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

export function toMask(
  segData: Uint8Array,
    clr: Color = {
      r: 0,
      g: 255,
      b: 0,
      a: 255
    }, width = 640, height=480,
    foregroundIds: number[] = [1]): ImageData {
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
      if (foregroundIds.some(
              id => id === segData[n])) {
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

export function drawMask(
    canvas: HTMLCanvasElement, maskImage: ImageData|null,
    maskOpacity = 0.7, width, height) {
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
const RAINBOW_PART_COLORS: Array<[number, number, number]> = [
  [110, 64, 170], [143, 61, 178], [178, 60, 178], [210, 62, 167],
  [238, 67, 149], [255, 78, 125], [255, 94, 99],  [255, 115, 75],
  [255, 140, 56], [239, 167, 47], [217, 194, 49], [194, 219, 64],
  [175, 240, 91], [135, 245, 87], [96, 247, 96],  [64, 243, 115],
  [40, 234, 141], [28, 219, 169], [26, 199, 194], [33, 176, 213],
  [47, 150, 224], [65, 125, 224], [84, 101, 214], [99, 81, 195]
];

export function toColoredPartMask(
  partSegmentation: SemanticPartSegmentation|PartSegmentation[],
  partColors: Array<[number, number, number]> =
      RAINBOW_PART_COLORS): ImageData {
if (Array.isArray(partSegmentation) && partSegmentation.length === 0) {
  return null;
}

let multiPersonPartSegmentation;
if (!Array.isArray(partSegmentation)) {
  multiPersonPartSegmentation = [partSegmentation];
} else {
  multiPersonPartSegmentation = partSegmentation;
}
const {width, height} = multiPersonPartSegmentation[0];
const bytes = new Uint8ClampedArray(width * height * 4);

for (let i = 0; i < height * width; ++i) {
  // invert mask.  Invert the segmentation mask.
  const j = i * 4;
  bytes[j + 0] = 0;
  bytes[j + 1] = 0;
  bytes[j + 2] = 0;
  bytes[j + 3] = 0;
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