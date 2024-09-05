import { Errors } from "./Errors.js";

export function isImageMime(mime) {
  if (Errors.INVALID_IMAGE().supported.includes(mime)) {
    return true;
  }
}

export function safeFilename(filename) {
  // remove dots from the start of the filename
  let str = filename;
  while (str.trim().startsWith(".")) {
    str = str.trim().slice(1);
  }
  if (!str) return "unnamed";
  return str;
}

export async function checkIfDirectory(path) {
  if (!path) return false;
  try {
    const stat = await fs.promises.stat(path);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

export function isUrl(url) {
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return true;
  }
}

export async function fetchHeaders(url) {
  const res = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    follow: 4,
  }).catch(() => {});
  if (!res) return null;
  return res;
}

/**
 * @param {Response | undefined | null} res
 * @returns {Promise<string | null>}
 */
export async function getMimeByUrl(res) {
  if (!res) return null;
  const type = res.headers.get("content-type");
  return type;
}
