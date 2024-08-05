import express from "express";
import config from "./config.js";
import { uploadRouter } from "./routes/uploadImagesRoutes.js";
import { getImagesRouter } from "./routes/getImagesRoutes.js";
import { deleteImagesRouter } from "./routes/deleteImagesRoutes.js";
import { proxyRouter } from "./routes/proxyRoutes.js";
import helmet from "helmet";
import { workerData } from "node:worker_threads";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Add headers before the routes are defined
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "https://nerimity.com");
  res.setHeader("cpu", workerData.cpu.toString());
  next();
});

app.use(proxyRouter);
app.use(uploadRouter);
app.use(getImagesRouter);
app.use(deleteImagesRouter);

const port = config.PORT + workerData.cpu;

app.listen(port, () => {
  console.log(`Nerimity CDN started at port ${port}`);
});
