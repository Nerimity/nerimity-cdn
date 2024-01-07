import sharp from "sharp";
sharp.cache(false);

/**
 * Retrieves the metadata of an image file.
 *
 * @param {string} path - The path to the image file.
 */
export function getMetadata(path) {
  return sharp(path).metadata().catch(() => undefined);
}