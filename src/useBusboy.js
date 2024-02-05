import { generateFlakeId } from "./flake.js";
import path from "path";

import { Busboy } from "@fastify/busboy";
import { tempDirPath } from "./createFolders.js";
import fs from "fs";
import { Errors } from "./Errors.js";




/**
 *
 * @param {import('express').Request} req - The request object.
 * @param {import("express").res} res - The response object.
 */
export const useBusboy = (req, res) => {
  if (!req.headers["content-type"]) return;
  let fields = {};
  let file;
  let savePath;
  let err;

  /**
   * 
   * @param {{
   *  limits: import("@fastify/busboy").BusboyConfig["limits"]
   * }} opts
   * 
   * @returns {Promise<[{filename: string, uploadPath: string, mimeType: string, delete: () => Promise<void>}] | [null, null, string]>}
   */
  return (opts) =>
    new Promise((resolve) => {
      const busboy = new Busboy({ headers: req.headers, limits: opts?.limits });

      busboy.on("field", (name, value) => {
        fields[name] = value;
      });

      busboy.on("file", (name, stream, filename, encoding, mimeType) => {
        if (file) return;
        file = {
          filename,
          mimeType
        };

        const id = generateFlakeId();
        const parsedFilename = path.parse(filename);
        savePath = path.join(tempDirPath, id + parsedFilename.ext);

        const writeStream = fs.createWriteStream(savePath);
        stream.pipe(writeStream);

        writeStream.on("close", () => {
          if (stream.truncated) {
            removeFile(savePath)
            err = Errors.MAX_SIZE_LIMIT(opts?.limits?.fileSize);
            return resolve([null, null, err]);
          }

          if (err) {
            return removeFile(savePath)
          }

          file.uploadPath = savePath;
          file.delete = () => removeFile(savePath);
          resolve([file, fields, null]);
        });

      });


      busboy.on("fieldsLimit", () => {
        removeFile(savePath)
        err = Errors.MAX_FIELD_LIMIT();
        resolve([null, null, err]);
      })

      busboy.on("filesLimit", () => {
        removeFile(savePath)
        err = Errors.MAX_FILES_LIMIT();
        resolve([null, null, err]);
      })
      busboy.on("partsLimit", () => {
        removeFile(savePath)
        err = Errors.MAX_PARTS_LIMIT();
        resolve([null, null, err]);
      })

      busboy.on("finish", () => {
        if (file) return;
        err = Errors.INTERNAL_ERROR();
        resolve([null, null, err]);
      })

      req.pipe(busboy);
    });
};


export async function removeFile (path) {
  if (!path) return;
  return await fs.promises.unlink(path).catch(() => {})
}