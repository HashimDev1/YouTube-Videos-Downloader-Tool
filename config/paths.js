import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

export const isWindows = process.platform === "win32";

export const FFMPEG_DIR =
  process.env.FFMPEG_DIR || (isWindows ? "C:\\ffmpeg\\bin" : "");

export const FFMPEG_EXE =
  process.env.FFMPEG_EXE ||
  (isWindows ? "C:\\ffmpeg\\bin\\ffmpeg.exe" : "ffmpeg");

export const downloadsDir =
  process.env.DOWNLOADS_DIR ||
  (isWindows ? "D:\\YoutubeDownloads" : "/tmp/downloads");

export const COOKIES_FILE =
  process.env.COOKIES_FILE || path.join(rootDir, "cookies.txt");

export const hasCookies = fs.existsSync(COOKIES_FILE);