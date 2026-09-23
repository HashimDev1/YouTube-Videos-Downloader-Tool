import BaseProvider from "./BaseProvider.js";
import { FFMPEG_DIR, COOKIES_FILE, hasCookies } from "../../config/paths.js";

export default class FacebookProvider extends BaseProvider {
  constructor() {
    super("Facebook");
  }

  detect(url) {
    if (!url) return false;
    return /facebook\.com|fb\.watch/i.test(url);
  }

  normalizeInfo(info, url) {
    const base = super.normalizeInfo(info, url);
    
    // Facebook-specific page/author and title details
    base.channel = info.uploader || info.page_name || info.creator || "Facebook Creator";
    
    const formats = info.formats || [];
    const hasHd = formats.some(f => f.height >= 720);
    
    // Map HD/SD to standard 720p/360p for validation compatibility
    const qualities = ["360"];
    if (hasHd) {
      qualities.push("720");
    }
    qualities.push("best");
    base.qualities = qualities;

    // Estimate file sizes for different formats
    const estimatedSizes = {};
    formats.forEach(f => {
      const size = f.filesize || f.filesize_approx;
      if (size) {
        const sizeFormatted = this.formatSize(size);
        if (f.height >= 720) {
          estimatedSizes["720"] = sizeFormatted;
        } else if (f.height >= 360) {
          estimatedSizes["360"] = sizeFormatted;
        }
      }
    });

    // Fallback for best size estimation
    const bestFormat = formats.find(f => f.format_id === "hd" || f.height >= 720) || formats[formats.length - 1];
    if (bestFormat) {
      const bestSize = bestFormat.filesize || bestFormat.filesize_approx;
      if (bestSize) {
        estimatedSizes["best"] = this.formatSize(bestSize);
      }
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

    if (format === "mp4") {
      if (quality === "best") {
        args.push("-f", "bestvideo+bestaudio/best");
      } else if (quality === "720") {
        args.push("-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best");
      } else {
        args.push("-f", "bestvideo[height<=360]+bestaudio/best[height<=360]/best");
      }
      args.push("--merge-output-format", "mp4");
    } else {
      args.push(
        "-f",
        "bestaudio/best",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
      );
    }

    args.push(url);
    return args;
  }
}
