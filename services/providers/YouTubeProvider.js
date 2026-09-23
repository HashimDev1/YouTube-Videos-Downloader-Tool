import BaseProvider from "./BaseProvider.js";
import { extractQualities } from "../../utils/formatters.js";
import { FFMPEG_DIR, COOKIES_FILE, hasCookies } from "../../config/paths.js";

export default class YouTubeProvider extends BaseProvider {
  constructor() {
    super("YouTube");
  }

  detect(url) {
    if (!url) return false;
    return /youtube\.com|youtu\.be/i.test(url);
  }

  normalizeInfo(info, url) {
    const base = super.normalizeInfo(info, url);
    base.qualities = extractQualities(info.formats || []);
    return base;
  }

  buildDownloadArgs({ baseArgs, outputTemplate, format, quality, url }) {
    const args = [
      ...baseArgs,
      "--remote-components",
      "ejs:github",
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

    if (process.env.YOUTUBE_PROXY) {
      args.push("--proxy", process.env.YOUTUBE_PROXY);
    }

    if (format === "mp4") {
      if (quality === "best") {
        args.push(
          "-f",
          "bestvideo+bestaudio/best",
          "-S",
          "res,fps,vcodec:avc1,acodec:m4a",
          "--merge-output-format",
          "mp4",
        );
      } else {
        args.push(
          "-f",
          `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`,
          "-S",
          "res,fps,vcodec:avc1,acodec:m4a",
          "--merge-output-format",
          "mp4",
        );
      }
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

    args.push("--", url);
    return args;
  }
}
