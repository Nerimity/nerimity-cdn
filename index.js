import path from 'path';
import fs from 'fs';
import promiseFS from 'fs/promises'
import { fileURLToPath } from 'url';
import express from 'express';
import connectBusboy from 'connect-busboy';
import config from './config.js';
import serveStatic from 'serve-static';
import fid from '@brecert/flakeid';
import sharp from 'sharp';

const DirNames = {
  ProfileAvatar: 'avatars',
  ProfileBanner: 'profile_banners',
  Attachments: 'attachments',
  Emojis: 'emojis',
}


const FlakeId = fid.default;

const flake = new FlakeId({
  mid : 42,
  timeOffset : (2013-1970)*31536000*1000 
});

import gm from 'gm';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
const gmInstance = gm.subClass({ imageMagick: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDirPath = path.join(__dirname, 'public');
const avatarsDirPath = path.join(publicDirPath, DirNames.ProfileAvatar);
const bannersDirPath = path.join(publicDirPath, DirNames.ProfileBanner);
const attachmentsDirPath = path.join(publicDirPath, DirNames.Attachments);
const emojisDirPath = path.join(publicDirPath, DirNames.Emojis);


if (!fs.existsSync(avatarsDirPath)) {
  fs.mkdirSync(avatarsDirPath, {recursive: true});
}
if (!fs.existsSync(bannersDirPath)) {
  fs.mkdirSync(bannersDirPath, {recursive: true});
}

if (!fs.existsSync(attachmentsDirPath)) {
  fs.mkdirSync(attachmentsDirPath, {recursive: true});
}
if (!fs.existsSync(emojisDirPath)) {
  fs.mkdirSync(emojisDirPath, {recursive: true});
}

const app = express();

const Errors = {
  "INVALID_SECRET": {type: "INVALID_SECRET", code: 1},
  "NO_FILE": {type: "NO_FILE", code: 2},
  "MISSING_ID": {type: "MISSING_ID", code: 3},
  "MAX_SIZE_LIMIT": {type: "MAX_SIZE_LIMIT", code: 4, limit: "7MB"},
  "INVALID_IMAGE": {type: "INVALID_IMAGE", code: 5, supported: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']},
  "COMPRESS_ERROR": {type: "COMPRESS_ERROR", code: 6},
  "INVALID_PATH": {type: "INVALID_PATH", code: 7},
  "INVALID_POINTS": {type: "INVALID_POINTS", code: 8},
}


app.get("/proxy/:imageUrl/*", async (req, res) => {
  res.header('Cache-Control', 'public, max-age=31536000');
  res.header('Access-Control-Allow-Origin', 'https://nerimity.com');

  const unsafeImageUrl = req.params.imageUrl;
  const type = req.query.type;

  if (!unsafeImageUrl || !isUrl(unsafeImageUrl)) {
    res.status(403).end();
    return;
  }

  const mime = await getMime(unsafeImageUrl);

  if (!isImage(mime)) {
    res.status(403).end();
    return;
  }
  res.header('Content-Type', mime);


  const imageRes = await fetch(unsafeImageUrl).catch(err => console.log(err));

  if (type === "webp") {
    gmInstance(Buffer.from(await imageRes.arrayBuffer())).selectFrame(0).stream("png", (err, stdout) => {
      if (err) {
        return res.status(403).end();
      }
      res.set('Cache-Control', 'public, max-age=31536000');
      res.set('Accept-Ranges', 'bytes');
      res.header("Content-Type", "image/webp");
      stdout.pipe(res)
    })
    return;
  }

  pipeline(imageRes.body, res);
})

app.get("/proxy-dimensions", async (req, res) => {
  res.header('Cache-Control', 'public, max-age=31536000');

  const unsafeImageUrl = req.query.url;
  const secret = req.query.secret;
  if (secret !== config.SECRET) return res.status(403).end()

  if (!unsafeImageUrl || !isUrl(unsafeImageUrl)) {
    res.status(403).end();
    return;
  }

  const mime = await getMime(unsafeImageUrl);

  if (!isImage(mime)) {
    res.status(403).end();
    return;
  }

  try {
    const imageRes = await fetch(unsafeImageUrl)
    const metadata = await sharp(await imageRes.arrayBuffer()).metadata()
    res.json({height: metadata.height, width: metadata.width})
  } catch {
    res.status(403).end();
  }
})



app.get("/*", async (req, res, next) => {
  const type = req.query.type;
  if (!type) return next();

  const decodedPath = path.join(path.dirname(req.path), decodeURI(path.basename(req.path)))


  if (decodedPath.includes("../")) return res.status(404).json(Errors.INVALID_PATH);
  const fullPath = path.join(publicDirPath, decodedPath);

  if (await checkIfDirectory(fullPath)) return res.status(404).json(Errors.INVALID_PATH);

  
  const stream = fs.createReadStream(fullPath);
  
  stream.on('error', (err) => {
    console.log(err)
    res.status(404).end();
  });
  
  gmInstance(stream).selectFrame(0).stream("png", (err, stdout) => {
    if (err) {
      console.log(err)
      return next();
    }
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Accept-Ranges', 'bytes');
    res.header("Content-Type", "image/webp");
    stdout.pipe(res)
  })

})


app.use(serveStatic(publicDirPath, {
  maxAge: '1d',
  setHeaders: headerControl
}))



app.post("/avatars", connectBusboy({immediate: true, limits: {files: 1, fileSize: 7840000}}), (req, res) => {
  const data = {
    id: null,
    secret: null,
    file: null,
    points: null,
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
    fileDir = path.join(avatarsDirPath,  data.id, fileId + extName);

    if (!isImage(info.mimeType)) {
      return res.status(403).json(Errors.INVALID_IMAGE);
    }
    const size = 200;

    let points;
    let dimensions;

    try {
      points = JSON.parse(data.points || null);
      if (points !== null) {
        if (!Array.isArray(points)) return res.status(403).json(Errors.INVALID_POINTS);
        if (points.length !== 4) return res.status(403).json(Errors.INVALID_POINTS);
        const invalidPoint = points.find(point => typeof point !== "number" || isNaN(point) || point < 0 || point > 9999);
        if (invalidPoint) return res.status(403).json(Errors.INVALID_POINTS);
        dimensions = points && getDimensions(points);
      }
    } catch(err) {
      return res.status(403).json(Errors.INVALID_POINTS);
    }



    await fs.promises.rm(path.join(avatarsDirPath, data.id), {recursive: true, force: true})
    await fs.promises.mkdir(path.join(avatarsDirPath, data.id))

  

    let makeGM = gmInstance(file)
      .quality(90)
      .autoOrient()
      //crop
      .coalesce()

      if (points) {
        makeGM = makeGM
          .crop(dimensions.width, dimensions.height, points[0], points[1])
          .resize(size, size, "^")
          .repage("+")
      } else {
        makeGM = makeGM.resize(size, size, "^")
        .gravity("Center")
        .crop(size, size)
        .repage("+")
      }


      makeGM.dither(false)
      .matte()
      .fuzz(10)
      .colors(128)
      //
      .write(fileDir, (err) => {
        if (err) {
          console.log(err, fileDir);
          return res.status(403).json(Errors.COMPRESS_ERROR);
        }
        res.status(200).json({path: path.join(DirNames.ProfileAvatar, data.id, fileId + extName)});
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


function getDimensions(points) {
  const [startX, startY, endX, endY ] = points;
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return { width, height };
}


app.post("/emojis", connectBusboy({immediate: true, limits: {files: 1, fileSize: 7840000}}), (req, res) => {
  const data = {
    secret: null,
    file: null,
  }

  let fileDir;

  req.busboy.on('file', async (name, file, info) => {
    if (data.secret !== config.SECRET) {
      return res.status(403).json(Errors.INVALID_SECRET);
    }
    
    if (data.file) return res.status(403).end();
    data.file = file;

    let extName = path.extname(info.filename);
    if (extName !== ".gif") {
      extName = ".webp"
    }

    const fileId = flake.gen();
    fileDir = path.join(emojisDirPath, fileId + extName);

    if (!isImage(info.mimeType)) {
      return res.status(403).json(Errors.INVALID_IMAGE);
    }
    const size = 100;


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
        res.status(200).json({path: path.join(DirNames.Emojis, fileId + extName), gif: extName === ".gif", id: fileId.toString()});
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







app.post("/banners", connectBusboy({immediate: true, limits: {files: 1, fileSize: 7840000}}), (req, res) => {
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
    fileDir = path.join(bannersDirPath,  data.id, fileId + extName);

    if (!isImage(info.mimeType)) {
      return res.status(403).json(Errors.INVALID_IMAGE);
    }

    await fs.promises.rm(path.join(bannersDirPath, data.id), {recursive: true, force: true})
    await fs.promises.mkdir(path.join(bannersDirPath, data.id))

    

    gmInstance(file)
      .resize(1920, 1080, ">")
      .quality(90)
      .autoOrient()
      .write(fileDir, (err) => {
        if (err) {
          console.log(err, fileDir);
          return res.status(403).json(Errors.COMPRESS_ERROR);
        }
        res.status(200).json({path: path.join(DirNames.ProfileBanner, data.id, fileId + extName)});
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

app.post("/attachments", connectBusboy({immediate: true, limits: {files: 1, fileSize: 7840000}}), (req, res) => {
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

    const baseName = safeFilename(path.basename(info.filename, extName))
    if (extName !== ".gif") {
      extName = ".webp"
    }

    const fileId = flake.gen().toString();
    fileDir = path.join(attachmentsDirPath, data.id, fileId,  baseName + extName);

    if (!isImage(info.mimeType)) {
      return res.status(403).json(Errors.INVALID_IMAGE);
    }

    await fs.promises.mkdir(path.join(attachmentsDirPath, data.id, fileId), {recursive: true});

    gmInstance(file)
      .resize(1920, 1080, ">")
      .quality(90)
      .autoOrient()
      .write(fileDir, async (err) => {
        if (err) {
          console.log(err, fileDir);
          return res.status(403).json(Errors.COMPRESS_ERROR);
        }

        const metadata = await sharp(fileDir).metadata();

        res.status(200).json({
          path: path.join(DirNames.Attachments, data.id, fileId,  encodeURI(baseName) + extName),
          dimensions: {width: metadata.width, height: metadata.height}
        });
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


// This runs in a interval in nerimity-server when a server channel is deleted.
app.delete("/channels/:channelId/attachments/batch", express.json(), async (req, res) => {
  const {secret} = req.body;
  if (secret !== config.SECRET) {
    return res.status(403).json(Errors.INVALID_SECRET);
  }

  const DELETE_BATCH = 1000;
  const channelPath = path.join(attachmentsDirPath, req.params.channelId);

  if (!fs.existsSync(channelPath)) {
    return res.status(404).json(Errors.INVALID_PATH)
  }

  const dir = await promiseFS.opendir(channelPath);

  const filesToDelete = [];

  let i = 0;
  for await (const dirent of dir) {
    if (i === DELETE_BATCH) break;
    const filePath = path.join(channelPath, dirent.name)
    filesToDelete.push(filePath);
    i++;
  }
  
  const promises = filesToDelete.map(filePath => 
    promiseFS.rm(filePath, {recursive: true, force: true}).catch(() => {})
  );

  await Promise.all(promises);
  
  if (filesToDelete.length < DELETE_BATCH) {
    await promiseFS.rm(channelPath, {recursive: true, force: true});
  }
  
  console.log("Deleted ", filesToDelete.length, "image(s).")
  return res.status(200).json({status: "deleted", count: filesToDelete.length});
})


app.delete("/", express.json(), async (req, res) => {
  const {secret, path: pathToDelete} = req.body;
  if (secret !== config.SECRET) {
    return res.status(403).json(Errors.INVALID_SECRET);
  }
  const fullPath = path.join(publicDirPath, decodeURI(pathToDelete));
  if (fullPath.includes("../")) return res.status(404).json(Errors.INVALID_PATH);

  if (await checkIfDirectory(fullPath)) return res.status(404).json(Errors.INVALID_PATH);

  // delete the file at the specified path.
  fs.unlink(fullPath, (err) => {
    if (err) {
      return res.status(404).json(Errors.FILE_NOT_FOUND);
    }
    // go back one directory and delete the folder if it's empty
    const parentDir = path.dirname(fullPath);
    fs.readdir(parentDir, (err, files) => {
      if (err) return res.status(500).json(Errors.INTERNAL_ERROR);
      if (files.length !== 0) return res.status(404).json({status: "deleted"});
      fs.rmdir(parentDir, (err) => {
        if (err) return res.status(500).json(Errors.INTERNAL_ERROR);
        return res.status(200).json({status: "deleted"});
      })
    });    
  });

})




function isUrl (url) {
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return true;
  }
}

// get image mime type by url
async function getMime (url) {
  const res = await fetch(url).catch(err => console.log(err));
  const type = res.headers.get('content-type');
  return type;
}


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


async function checkIfDirectory(path) {
  if (!path) return false;
  try {
    const stat = await fs.promises.stat(path);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

function safeFilename(filename) {
  // remove dots from the start of the filename
  let str = filename;
  while (str.trim().startsWith('.')) {
    str = str.trim().slice(1);
  }
  if (!str) return "unnamed";
  return str;
}