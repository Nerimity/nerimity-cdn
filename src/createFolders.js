import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const DirNames = {
  ProfileAvatar: 'avatars',
  ProfileBanner: 'profile_banners',
  Attachments: 'attachments',
  Emojis: 'emojis',
}



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const publicDirPath = path.join(__dirname, "../", 'public');

export const tempDirPath = path.join(__dirname, "../", 'temp');
export const avatarsDirPath = path.join(publicDirPath, DirNames.ProfileAvatar);
export const bannersDirPath = path.join(publicDirPath, DirNames.ProfileBanner);
export const attachmentsDirPath = path.join(publicDirPath, DirNames.Attachments);
export const emojisDirPath = path.join(publicDirPath, DirNames.Emojis);


export function createFolders() {
  
  fs.rmSync(tempDirPath, {recursive: true, force: true})
  fs.mkdirSync(tempDirPath, {recursive: true})
  
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

}