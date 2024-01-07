import gm from 'gm';
import path from 'path';
import { getMetadata } from './sharp.js';
import { Errors } from './Errors.js';
import fs from 'fs';

export const imageMagick = gm.subClass({ imageMagick: "7+" });




/**
 * Compresses an image.
 *
 * @param {{
 *  tempPath: string
 *  newPath: string
 *  filename: string
 *  size: [number, number, "fit" | "fill"]
 *  crop?: [number, number, number, number] | [number, number]
 * }} opts - The options for compressing the image.
 * @return {Promise<[{gif: boolean; path: string; newFilename: string; dimensions: {width: number, height: number;}}, null] | [null, any]>} A promise that resolves to the metadata of the compressed image.
 */
export const compressImage = async (opts) => {
  const oldMetadata = await getMetadata(opts.tempPath);
  if (!oldMetadata) return [null, Errors.COMPRESS_ERROR()]

  const isAnimated = !!oldMetadata.pages;

  const parsedFilename = path.parse(opts.filename);
  const newFilename = parsedFilename.name + (isAnimated ? ".gif" : ".webp");


  await fs.promises.mkdir(opts.newPath, {recursive: true});


  const newPath = path.join(opts.newPath, newFilename);

  let im = imageMagick(opts.tempPath);

  im = im.quality(90)
    .autoOrient()
    .coalesce();



  if (!opts.crop) {
    im = im
      .resize(opts.size[0], opts.size[1], opts.size[2] === "fit" ? ">" : "^")
  }

  if (opts.crop?.length <= 2) {
    im = im
      .resize(opts.size[0], opts.size[1], opts.size[2] === "fit" ? ">" : "^")
      .gravity("Center")
      .crop(...opts.crop)
      .repage("+")
  }

  if (opts.crop?.length > 2) {
    im = im
      .crop(...opts.crop)
      .resize(opts.size[0], opts.size[1], opts.size[2] === "fit" ? ">" : "^")
      .repage("+")
  } 


  return new Promise((resolve) => {
    im.write(newPath, async (err) => {
      if (err) return resolve([null, Errors.COMPRESS_ERROR()])
      const newMetadata = await getMetadata(newPath);
      if (!newMetadata) { removeFile(newPath); return resolve([null, Errors.COMPRESS_ERROR()]) }
      resolve([{
        path: path.join(newPath, newFilename),
        newFilename,
        dimensions: {width: newMetadata.width, height: newMetadata.height},
        gif: isAnimated
      }, null])
    });
  })
   

}


/**
 * Converts a GIF image to a static WebP image.
 *
 * @param {string | import("stream").Readable} pathOrStream - The path to the GIF image.
 * @return {Promise<[import("stream").Readable, null] | [null, Error]>} - A promise that resolves to an array containing the WebP stream and any error that occurred.
 */
export async function gifToStaticWebp(pathOrStream) {
  return new Promise(resolve => {
    imageMagick(pathOrStream).selectFrame(0).stream("webp", (err, stream) => {
      if (err) return resolve([null, err])
      resolve([stream, null])
    });
  })
}




/**
 * Converts an array of points into dimensions.
 *
 * @param {string} points - The array of points to be converted.
 * @return {[{width: number, height: number}, [number, number], null] | [null, null, any]} An array containing the dimensions or an error object.
 */
export const pointsToDimensions = (pointsStr) => {
  let parsedPoints;
  let dimensions;

  try {
    parsedPoints = JSON.parse(pointsStr || null);
    if (parsedPoints !== null) {
      if (!Array.isArray(parsedPoints)) return [null, null, Errors.INVALID_POINTS()]
      if (parsedPoints.length !== 4) return [null, null, Errors.INVALID_POINTS()]
      const invalidPoint = parsedPoints.find(point => typeof point !== "number" || isNaN(point) || point < 0 || point > 9999);
      if (invalidPoint) return [null, null, Errors.INVALID_POINTS()]
      dimensions = parsedPoints && getDimensions(parsedPoints);
      return [dimensions, parsedPoints, null]
    }
    return [null, null, null]
  } catch(err) {
    return [null, null, Errors.INVALID_POINTS()]
  }
}


function getDimensions(points) {
  const [startX, startY, endX, endY ] = points;
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return { width, height };
}
