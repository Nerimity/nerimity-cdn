import cluster from "node:cluster";
import { cpus } from "node:os";
import { createFolders } from "./createFolders.js";

if (cluster.isPrimary) {
  createFolders();
  const cpuCount = cpus().length;

  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker process ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  import("./worker.js");
}
