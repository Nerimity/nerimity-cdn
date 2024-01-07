import { Router } from 'express';
import serveStatic from 'serve-static';
import { publicDirPath } from '../createFolders.js';
import path from 'path';
import fs from 'fs';
import { checkIfDirectory } from '../utils.js';
import { gifToStaticWebp, imageMagick } from '../imageMagick.js';



const getImagesRouter = Router();



getImagesRouter.get("/*", async (req, res, next) => {
  const type = req.query.type;
  if (!type) return next();

  const decodedPath = path.join(path.dirname(req.path), decodeURI(path.basename(req.path)))


  if (decodedPath.includes("../")) return res.status(404).json(Errors.INVALID_PATH);
  const fullPath = path.join(publicDirPath, decodedPath);

  const isDirectory = await checkIfDirectory(fullPath);

  if (isDirectory) return res.status(404).json(Errors.INVALID_PATH);

  const [stream, err] = await gifToStaticWebp(fullPath);
  if (err) return next();

  res.set('Cache-Control', 'public, max-age=31536000');
  res.set('Accept-Ranges', 'bytes');
  res.header("Content-Type", "image/webp");

  stream.pipe(res)


})


getImagesRouter.use(serveStatic(publicDirPath, {
  maxAge: '1d',
  setHeaders: headerControl
}))



function headerControl (res, path) {
  if (!serveStatic.mime.lookup(path).startsWith('image')) {
    res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(path));
    return;
  }
  res.set('Cache-Control', 'public, max-age=31536000');
}


export {getImagesRouter}