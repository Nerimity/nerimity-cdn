import { Router } from "express";
import serveStatic from "serve-static";
import { publicDirPath } from "../createFolders.js";
import path from "path";
import { checkIfDirectory } from "../utils.js";
import { miniConvert } from "../imageMagick.js";
import { getMimeType } from "stream-mime-type";

const getImagesRouter = Router();

getImagesRouter.get("/*", async (req, res, next) => {
  const type = req.query.type;
  let size = req.query.size;
  if (!type && !size) return next();

  size = parseInt(size);

  if (size >= 1920) {
    size = 1920;
  }
  if (!size) {
    size = 0;
  }

  const decodedPath = path.join(
    path.dirname(req.path),
    decodeURI(path.basename(req.path))
  );

  if (decodedPath.includes("../"))
    return res.status(404).json(Errors.INVALID_PATH);
  const fullPath = path.join(publicDirPath, decodedPath);

  const isDirectory = await checkIfDirectory(fullPath);

  if (isDirectory) return res.status(404).json(Errors.INVALID_PATH);

  const [inStream, err] = await miniConvert(fullPath, {
    size: parseInt(size),
    static: type === "webp",
  });
  if (err) {
    console.error(err);
    return next();
  }

  const { stream, mime } = await getMimeType(inStream);

  res.set("Cache-Control", "public, max-age=1800");
  res.set("Accept-Ranges", "bytes");
  res.set("Content-Type", mime || "image/webp");

  stream.pipe(res);
});

getImagesRouter.use(
  serveStatic(publicDirPath, {
    maxAge: "1d",
    setHeaders: headerControl,
  })
);

function headerControl(res, path) {
  if (!serveStatic.mime.lookup(path).startsWith("image")) {
    res.setHeader(
      "Content-disposition",
      "attachment; filename=" + path.basename(path)
    );
    return;
  }
  res.set("Cache-Control", "public, max-age=1800");
}

export { getImagesRouter };
