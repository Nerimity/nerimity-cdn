import express from "express";
import config from "./config.js";
import { uploadRouter } from "./routes/uploadImagesRoutes.js";
import { getImagesRouter } from "./routes/getImagesRoutes.js";
import { deleteImagesRouter } from "./routes/deleteImagesRoutes.js";
import { proxyRouter } from "./routes/proxyRoutes.js";
import helmet from "helmet";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Add headers before the routes are defined
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "https://nerimity.com");
  res.setHeader("pid", process.pid);
  next();
});

app.use(proxyRouter);
app.use(uploadRouter);
app.use(getImagesRouter);
app.use(deleteImagesRouter);

app.listen(config.PORT, () => {
  console.log(`Nerimity CDN started at port ${config.PORT}`);
});
