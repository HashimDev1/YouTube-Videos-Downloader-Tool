import { runYtDlpJson } from "../ytDlpService.js";
import { formatDuration } from "../../utils/formatters.js";

export default class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  detect(url) {
    return false;
  }

  async getInfo(url) {
    try {
      const rawInfo = await runYtDlpJson(url);
      return this.normalizeInfo(rawInfo, url);
    } catch (err) {
      throw new Error(`Failed to retrieve metadata: ${err.message}`);
    }
  }

  normalizeInfo(info, url) {
    const thumbnails = Array.isArray(info.thumbnails) ? info.thumbnails : [];
    const bestThumb = thumbnails.length > 0
      ? thumbnails[thumbnails.length - 1]?.url
      : info.thumbnail || "";

    return {
      id: info.id || null,
      title: info.title || "Unknown Title",
      thumbnail: bestThumb,
      duration: formatDuration(info.duration),
      duration_seconds: info.duration || null,
      channel: info.uploader || info.channel || info.creator || "Unknown Author",
      view_count: info.view_count || 0,
      upload_date: info.upload_date || "",
      description: info.description || "",
      qualities: ["best"],
      platform: this.name,
      url,
    };
  }

  buildDownloadArgs({ baseArgs, outputTemplate, format, quality, url, watermarkFree }) {
    throw new Error("buildDownloadArgs() must be implemented by subclass.");
  }
}
