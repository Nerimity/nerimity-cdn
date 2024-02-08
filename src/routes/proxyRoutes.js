import { Router } from 'express';
import { getMimeByUrl, isImageMime, isUrl } from '../utils.js';
import config from '../config.js';
import { miniConvert } from '../imageMagick.js';
import { pipeline } from 'stream/promises';
import https from 'https';
import { getMetadata } from '../sharp.js';


const proxyRouter = Router();



proxyRouter.get("/proxy/:imageUrl/:filename", async (req, res) => {
  res.header('Cache-Control', 'public, max-age=31536000');
  res.header('Access-Control-Allow-Origin', 'https://nerimity.com');

  const unsafeImageUrl = decodeURIComponent(req.params.imageUrl);
  const type = req.query.type;

  if (!unsafeImageUrl || !isUrl(unsafeImageUrl)) {
    res.status(403).end();
    return;
  }

  const mime = await getMimeByUrl(unsafeImageUrl);

  if (!isImageMime(mime)) {
    res.status(403).end();
    return;
  }
  res.header('Content-Type', mime);



  
  
  https.get(unsafeImageUrl, async (imageRes) => {      
    if (type === "webp") {
      const [stream, error] = await miniConvert(imageRes, {static: true});
      
      if (error) {
        return res.status(403).end();
      }

      res.set('Cache-Control', 'public, max-age=31536000');
      res.set('Accept-Ranges', 'bytes');
      res.header("Content-Type", "image/webp");
      
      stream.pipe(res)
      return;
    }
    imageRes.pipe(res)
  })
})

proxyRouter.get("/proxy-dimensions", async (req, res) => {
  res.header('Cache-Control', 'public, max-age=31536000');

  const unsafeImageUrl = req.query.url;
  const secret = req.query.secret;
  if (secret !== config.SECRET) return res.status(403).end()

  
  if (!unsafeImageUrl || !isUrl(unsafeImageUrl)) {
    res.status(403).end();
    return;
  }
  
  const mime = await getMimeByUrl(unsafeImageUrl);
  
  if (!isImageMime(mime)) {
    res.status(403).end();
    return;
  }
  try {
    const imageRes = await fetch(unsafeImageUrl)
    const metadata = await getMetadata(await imageRes.arrayBuffer())
    res.json({height: metadata.height, width: metadata.width})
  } catch {
    res.status(403).end();
  }
})


export {proxyRouter}