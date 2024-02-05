import { Router } from 'express';
import { useBusboy } from '../useBusboy.js';
import { DirNames, attachmentsDirPath, avatarsDirPath, bannersDirPath, emojisDirPath } from '../createFolders.js';
import { generateFlakeId } from '../flake.js';
import { Errors } from '../Errors.js';
import { compressImage, pointsToDimensions } from '../imageMagick.js';
import path from 'path';
import fs from 'fs';
import { isImageMime, safeFilename } from '../utils.js';
import config from '../config.js';


const uploadRouter = Router();


uploadRouter.post("/attachments", async (req, res) => {
  const busboy = useBusboy(req, res);
  if (!busboy) return res.status(403).end()

  const [file, fields, error] = await busboy({
    limits: {
      fileSize: 12 * 1024 * 1024,
      fields: 2,
      files: 1,
    }
  })



  if (!file || error) {
    file?.delete();
    return res.status(403).json(error);
  }

  if (fields.secret !== config.SECRET) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_SECRET());
  }

  if (!isImageMime(file.mimeType)) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const parsedFile = path.parse(file.filename);
  if (!parsedFile.ext) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const tempPath = file.uploadPath;

  const fileId = generateFlakeId();
  const newPath = path.join(attachmentsDirPath, fields.id, fileId);

  const [result, err] = await compressImage({
    tempPath,
    filename: safeFilename(parsedFile.name) + parsedFile.ext,
    newPath,
    size: [1920, 1080, "fit"]
  })

  if (err) {
    file?.delete();
    return res.status(403).json(err);
  }

  file?.delete();

  const newParsedFile = path.parse(result.newFilename);

  res.status(200).json({
    path: path.join(DirNames.Attachments, fields.id, fileId, encodeURI(newParsedFile.name) + newParsedFile.ext),
    dimensions: result.dimensions
  });

})

uploadRouter.post("/banners", async (req, res) => {
  const busboy = useBusboy(req, res);
  if (!busboy) return res.status(403).end()

  const [file, fields, error] = await busboy({
    limits: {
      fileSize: 12 * 1024 * 1024,
      fields: 2,
      files: 1,
    }
  })

  if (!file || error) {
    file?.delete();
    return res.status(403).json(error);
  }
  
  if (fields.secret !== config.SECRET) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_SECRET());
  }

  if (!isImageMime(file.mimeType)) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const parsedFile = path.parse(file.filename);
  if (!parsedFile.ext)  {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const tempPath = file.uploadPath;

  const fileId = generateFlakeId();
  const newPath = path.join(bannersDirPath, fields.id);

  await fs.promises.rm(path.join(bannersDirPath, fields.id), {recursive: true, force: true})

  const [result, err] = await compressImage({
    tempPath,
    filename: fileId + parsedFile.ext,
    newPath,
    size: [1920, 1080, "fit"]
  })

  if (err) {
    file?.delete();
    return res.status(403).json(err);
  }

  file?.delete();

  const newParsedFile = path.parse(result.newFilename);

  res.status(200).json({
    path: path.join(DirNames.ProfileBanner, fields.id, encodeURI(newParsedFile.name) + newParsedFile.ext),
    dimensions: result.dimensions
  });

})

uploadRouter.post("/emojis", async (req, res) => {
  const busboy = useBusboy(req, res);
  if (!busboy) return res.status(403).end()

  const [file, fields, error] = await busboy({
    limits: {
      fileSize: 12 * 1024 * 1024,
      fields: 2,
      files: 1,
    }
  })


  if (!file || error) {
    file?.delete();
    return res.status(403).json(error);
  }

  if (fields.secret !== config.SECRET) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_SECRET());
  }

  if (!isImageMime(file.mimeType)) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const parsedFile = path.parse(file.filename);
  if (!parsedFile.ext)  {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const tempPath = file.uploadPath;

  const fileId = generateFlakeId();
  const newPath = path.join(emojisDirPath);


  const [result, err] = await compressImage({
    tempPath,
    filename: fileId + parsedFile.ext,
    newPath,
    size: [100, 100, "fit"]
  })

  if (err) {
    file?.delete();
    return res.status(403).json(err);
  }

  file?.delete();

  const newParsedFile = path.parse(result.newFilename);

  res.status(200).json({
    path: path.join(DirNames.Emojis, encodeURI(newParsedFile.name) + newParsedFile.ext),
    gif: result.gif,
    id: fileId
  });

})

uploadRouter.post("/avatars", async (req, res) => {
  const busboy = useBusboy(req, res);
  if (!busboy) return res.status(403).end()

  const [file, fields, error] = await busboy({
    limits: {
      fileSize: 12 * 1024 * 1024,
      fields: 3,
      files: 1,
    }
  })


  if (!file || error) {
    file?.delete();
    return res.status(403).json(error);
  }

  if (fields.secret !== config.SECRET) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_SECRET());
  }
  
  if (!isImageMime(file.mimeType)) {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const parsedFile = path.parse(file.filename);
  if (!parsedFile.ext)  {
    file?.delete();
    return res.status(403).json(Errors.INVALID_IMAGE());
  }

  const tempPath = file.uploadPath;

  const fileId = generateFlakeId();
  const newPath = path.join(avatarsDirPath, fields.id);

  await fs.promises.rm(path.join(avatarsDirPath, fields.id), {recursive: true, force: true})

  const [dimensions, points, dimErr] = pointsToDimensions(fields.points);

  if (dimErr) {
    file?.delete();
    return res.status(403).json(dimErr);
  }

  const [result, err] = await compressImage({
    tempPath,
    filename: fileId + parsedFile.ext,
    newPath,
    crop: dimensions ? [dimensions.width, dimensions.height, points[0], points[1]] : [200, 200],
    size: [200, 200, "fit"]
  })

  if (err) {
    file?.delete();
    return res.status(403).json(err);
  }

  file?.delete();

  const newParsedFile = path.parse(result.newFilename);

  res.status(200).json({
    path: path.join(DirNames.ProfileAvatar, fields.id, encodeURI(newParsedFile.name) + newParsedFile.ext),
    dimensions: result.dimensions
  });

})


export {uploadRouter}