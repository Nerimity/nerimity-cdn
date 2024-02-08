import express from 'express';
import config from './config.js';
import { createFolders } from './createFolders.js';
import { uploadRouter } from './routes/uploadImagesRoutes.js';
import { getImagesRouter } from './routes/getImagesRoutes.js';
import { deleteImagesRouter } from './routes/deleteImagesRoutes.js';
import { proxyRouter } from './routes/proxyRoutes.js';
import helmet from 'helmet';
createFolders();

const app = express();

app.use(helmet());
app.use(proxyRouter)
app.use(uploadRouter)
app.use(getImagesRouter)
app.use(deleteImagesRouter)




app.listen(config.PORT, () => {
  console.log(`Nerimity CDN started at port ${config.PORT}`);
})