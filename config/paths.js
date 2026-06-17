import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import ffmpeg from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

export const isWindows = process.platform === "win32";

// Use ffmpeg-static path if available, otherwise fallback
export const FFMPEG_EXE =
  process.env.FFMPEG_EXE || ffmpeg || (isWindows ? "C:\\ffmpeg\\bin\\ffmpeg.exe" : "ffmpeg");

export const FFMPEG_DIR =
  process.env.FFMPEG_DIR || (ffmpeg ? path.dirname(ffmpeg) : (isWindows ? "C:\\ffmpeg\\bin" : ""));

export const downloadsDir =
  process.env.DOWNLOADS_DIR ||
  (isWindows ? "D:\\YoutubeDownloads" : "/tmp/downloads");

export const COOKIES_FILE =
  process.env.COOKIES_FILE || path.join(rootDir, "cookies.txt");

// Auto-write cookies from environment variable if provided
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(COOKIES_FILE, process.env.YOUTUBE_COOKIES, "utf8");
    console.log("Created/Updated cookies.txt from YOUTUBE_COOKIES environment variable.");
  } catch (err) {
    console.error("Failed to write cookies.txt from YOUTUBE_COOKIES:", err);
  }
}

export const hasCookies = fs.existsSync(COOKIES_FILE);