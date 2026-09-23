import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import ffmpeg from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.join(__dirname, "..");

export const isWindows = process.platform === "win32";

// Ensure ffmpeg binary is executable on Linux/cloud hosts
if (!isWindows && ffmpeg && fs.existsSync(ffmpeg)) {
  try {
    fs.chmodSync(ffmpeg, 0o755);
  } catch (err) {
    // ignore
  }
}

// Use ffmpeg-static path if available, otherwise fallback
export const FFMPEG_EXE =
  process.env.FFMPEG_EXE || ffmpeg || (isWindows ? "C:\\ffmpeg\\bin\\ffmpeg.exe" : "ffmpeg");

export const FFMPEG_DIR =
  process.env.FFMPEG_DIR || (ffmpeg ? path.dirname(ffmpeg) : (isWindows ? "C:\\ffmpeg\\bin" : ""));

// Default downloads folder directly in project root downloads/ (works on Windows, Linux, Render)
export const downloadsDir =
  process.env.DOWNLOADS_DIR || path.join(rootDir, "downloads");

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

export const COOKIES_FILE =
  process.env.COOKIES_FILE || path.join(rootDir, "cookies.txt");

// Auto-write cookies from environment variable if provided
if (process.env.YOUTUBE_COOKIES) {
  try {
    const cookieContent = process.env.YOUTUBE_COOKIES
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    fs.writeFileSync(COOKIES_FILE, cookieContent, "utf8");
    console.log("Created/Updated cookies.txt from YOUTUBE_COOKIES environment variable.");
  } catch (err) {
    console.error("Failed to write cookies.txt from YOUTUBE_COOKIES:", err);
  }
}

export const hasCookies = fs.existsSync(COOKIES_FILE);