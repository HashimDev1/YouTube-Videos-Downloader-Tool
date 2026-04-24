import express from "express";
import { runYtDlpJson } from "../services/ytDlpService.js";
import { isValidUrl } from "../utils/validators.js";
import { extractQualities, formatDuration } from "../utils/formatters.js";

const router = express.Router();

router.post("/info", async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const info = await runYtDlpJson(url);

    const thumbnails = Array.isArray(info.thumbnails) ? info.thumbnails : [];
    const bestThumb =
      thumbnails.length > 0
        ? thumbnails[thumbnails.length - 1]?.url
        : info.thumbnail || "";

    const qualities = extractQualities(info.formats || []);

    return res.json({
      id: info.id || null,
      title: info.title || "Unknown title",
      thumbnail: bestThumb,
      duration: formatDuration(info.duration),
      duration_seconds: info.duration || null,
      channel: info.uploader || info.channel || "Unknown channel",
      view_count: info.view_count || 0,
      upload_date: info.upload_date || "",
      description: info.description || "",
      qualities,
    });
  } catch (error) {
    console.error("Info error:", error.message);

    return res.status(500).json({
      error:
        error.message ||
        "Could not fetch video details. YouTube may be blocking this server.",
    });
  }
});

export default router;