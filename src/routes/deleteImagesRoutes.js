import { Router, json } from 'express';
import { attachmentsDirPath, publicDirPath } from '../createFolders.js';
import path from 'path';
import fs from 'fs';
import { checkIfDirectory } from '../utils.js';
import { Errors } from '../Errors.js';
import config from '../config.js';


const deleteImagesRouter = Router();



// This runs in a interval in nerimity-server when a server channel is deleted.
deleteImagesRouter.delete("/channels/:channelId/attachments/batch", json(), async (req, res) => {
  const {secret} = req.body;
  if (secret !== config.SECRET) {
    return res.status(403).json(Errors.INVALID_SECRET());
  }

  const DELETE_BATCH = 1000;
  const channelPath = path.join(attachmentsDirPath, req.params.channelId);

  if (!fs.existsSync(channelPath)) {
    return res.status(404).json(Errors.INVALID_PATH())
  }

  const dir = await fs.promises.opendir(channelPath);

  const filesToDelete = [];

  let i = 0;
  for await (const dirent of dir) {
    if (i === DELETE_BATCH) break;
    const filePath = path.join(channelPath, dirent.name)
    filesToDelete.push(filePath);
    i++;
  }
  
  const promises = filesToDelete.map(filePath => 
    fs.promises.rm(filePath, {recursive: true, force: true}).catch(() => {})
  );

  await Promise.all(promises);
  
  if (filesToDelete.length < DELETE_BATCH) {
    await fs.promises.rm(channelPath, {recursive: true, force: true});
  }
  
  console.log("Deleted", filesToDelete.length, "image(s).")
  return res.status(200).json({status: "deleted", count: filesToDelete.length});
})


deleteImagesRouter.delete("/", json(), async (req, res) => {
  const {secret, path: pathToDelete} = req.body;
  if (secret !== config.SECRET) {
    return res.status(403).json(Errors.INVALID_SECRET());
  }
  const fullPath = path.join(publicDirPath, decodeURI(pathToDelete));
  if (fullPath.includes("../")) return res.status(404).json(Errors.INVALID_PATH());

  if (await checkIfDirectory(fullPath)) return res.status(404).json(Errors.INVALID_PATH());

  // delete the file at the specified path.
  fs.unlink(fullPath, (err) => {
    if (err) {
      return res.status(404).json(Errors.FILE_NOT_FOUND());
    }
    // go back one directory and delete the folder if it's empty
    const parentDir = path.dirname(fullPath);
    fs.readdir(parentDir, (err, files) => {
      if (err) return res.status(500).json(Errors.INTERNAL_ERROR());
      if (files.length !== 0) return res.status(404).json({status: "deleted"});
      fs.rmdir(parentDir, (err) => {
        if (err) return res.status(500).json(Errors.INTERNAL_ERROR());
        return res.status(200).json({status: "deleted"});
      })
    });    
  });

})



export {deleteImagesRouter}