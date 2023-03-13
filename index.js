import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import connectBusboy from 'connect-busboy';
import config from './config.js';
import serveStatic from 'serve-static';
import fid from '@brecert/flakeid';

const FlakeId = fid.default;

const flake = new FlakeId({
  mid : 42,
  timeOffset : (2013-1970)*31536000*1000 
});

import gm from 'gm';
const gmInstance = gm.subClass({ imageMagick: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');
const avatarDir = path.join(publicDir, 'avatars');


if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, {recursive: true});
}

const app = express();

const Errors = {
  "INVALID_SECRET": {type: "INVALID_SECRET", code: 1},
  "NO_FILE": {type: "NO_FILE", code: 2},
  "MISSING_ID": {type: "MISSING_ID", code: 3},
  "MAX_SIZE_LIMIT": {type: "MAX_SIZE_LIMIT", code: 4, limit: "7MB"},
  "INVALID_IMAGE": {type: "INVALID_IMAGE", code: 5, supported: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']},
  "COMPRESS_ERROR": {type: "COMPRESS_ERROR", code: 6},
}



app.get("/*", async (req, res, next) => {
  const type = req.query.type;
  if (!type) return next();
  if (req.path.includes("../")) return next();
  const fullPath = path.join(publicDir, req.path);

  res.set('Cache-Control', 'public, max-age=31536000');
  res.set('Accept-Ranges', 'bytes');
  res.header("Content-Type", "image/webp");

  const stream =  fs.createReadStream(fullPath);

  stream.on('error', () => {
    res.status(404).end();
  });

  gmInstance(stream).selectFrame(0).stream("webp", (err, stdout) => {
    if (err) return next();
    stdout.pipe(res)
  })


  
})


app.use(serveStatic(publicDir, {
  maxAge: '1d',
  setHeaders: headerControl
}))



app.post("/avatar", connectBusboy({immediate: true, limits: {files: 1, fileSize: 7840000}}), (req, res) => {
  const data = {
    id: null,
    secret: null,
    file: null,
  }

  let fileDir;

  req.busboy.on('file', async (name, file, info) => {
    if (data.secret !== config.SECRET) {
      return res.status(403).json(Errors.INVALID_SECRET);
    }
    
    if (data.file) return res.status(403).end();
    if (!data.id) return res.status(403).json(Errors.MISSING_ID);
    data.file = file;

    let extName = path.extname(info.filename);
    if (extName !== ".gif") {
      extName = ".webp"
    }

    const fileId = flake.gen();
    fileDir = path.join(avatarDir,  data.id, fileId + extName);

    if (!isImage(info.mimeType)) {
      return res.status(403).json(Errors.INVALID_IMAGE);
    }
    const size = 200;

    await fs.promises.rm(path.join(avatarDir, data.id), {recursive: true, force: true})
    await fs.promises.mkdir(path.join(avatarDir, data.id))

    

    gmInstance(file)
      // .resize(1920, 1080, ">")
      .quality(90)
      .autoOrient()
      //crop
      .coalesce()
      .resize(size, size, "^")
      .gravity("Center")
      .crop(size, size)
      .repage("+")
      .dither(false)
      .matte()
      .fuzz(10)
      .colors(128)
      //
      .write(fileDir, (err) => {
        if (err) {
          console.log(err, fileDir);
          return res.status(403).json(Errors.COMPRESS_ERROR);
        }
        res.status(200).json({path: path.join("avatars", data.id, fileId + extName)});
      })
  });

  req.busboy.on('field', (name, value, info) => {
    data[name] = value;
  });

  req.busboy.on('close', () => {
    if (data.file?.truncated) {
      res.status(403).json(Errors.MAX_SIZE_LIMIT);
      fs.unlink(fileDir, () => {});
      return;
    }
  })

  req.busboy.on('finish', () => {
    if (!data.file) {
      res.status(403).json(Errors.NO_FILE);
    }
  });
})

app.listen(config.PORT, ()=> {
  console.log(`Nerimity CDN started at port ${config.PORT}`);
})

function isImage(mime){
  if (Errors.INVALID_IMAGE.supported.includes(mime)) {
    return true;
  }
}


function headerControl (res, path) {
  if (!serveStatic.mime.lookup(path).startsWith('image')) {
    res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(path));
    return;
  }
  res.set('Cache-Control', 'public, max-age=31536000');
}