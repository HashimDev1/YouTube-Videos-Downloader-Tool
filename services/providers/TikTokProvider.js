import BaseProvider from "./BaseProvider.js";
import { FFMPEG_DIR, COOKIES_FILE, hasCookies } from "../../config/paths.js";

export default class TikTokProvider extends BaseProvider {
  constructor() {
    super("TikTok");
  }

  detect(url) {
    if (!url) return false;
    return /tiktok\.com|vm\.tiktok\.com/i.test(url);
  }

  normalizeInfo(info, url) {
    const base = super.normalizeInfo(info, url);
    
    // TikTok-specific username extraction
    base.channel = info.uploader || info.creator || info.uploader_id || "TikTok User";
    
    // TikTok-specific caption (often in description or title)
    base.description = info.description || info.title || "No caption";
    
    // Extract music title if available
    base.music_title = info.track || info.music_title || (info.music_info ? info.music_info.title : null) || "Original Sound";
    
    // TikTok download options: HD, Original
    base.qualities = ["original", "hd"];

    // File size estimation
    const estimatedSizes = {};
    const size = info.filesize || info.filesize_approx;
    if (size) {
      const sizeFormatted = this.formatSize(size);
      estimatedSizes["original"] = sizeFormatted;
      estimatedSizes["hd"] = sizeFormatted;
    }
    base.estimated_sizes = estimatedSizes;

    return base;
  }

  formatSize(bytes) {
    if (!bytes || Number.isNaN(Number(bytes))) return null;
    const units = ["B", "KB", "MB", "GB"];
    let size = Number(bytes);
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  buildDownloadArgs({ baseArgs, outputTemplate, format, quality, url }) {
    const args = [
      ...baseArgs,
      "--js-runtimes",
      "node",
      "--newline",
      "-o",
      outputTemplate,
    ];

    if (FFMPEG_DIR) {
      args.push("--ffmpeg-location", FFMPEG_DIR);
    }

    if (hasCookies) {
      args.push("--cookies", COOKIES_FILE);
    }

    if (format === "mp3") {
      args.push(
        "-f",
        "bestaudio/best",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
      );
    } else {
      // Default to best watermark-free original video
      args.push("-f", "bestvideo+bestaudio/best");
      args.push("--merge-output-format", "mp4");
    }

    args.push(url);
    return args;
  }
}
