import { Worker } from "node:worker_threads";
import { cpus } from "node:os";

import { createFolders } from "./createFolders.js";
createFolders();

const cpuCount = cpus().length;

for (let i = 0; i < cpuCount; i++) {
  const worker = new Worker("./src/worker.js", {
    workerData: {
      cpu: i,
    },
  });
}
