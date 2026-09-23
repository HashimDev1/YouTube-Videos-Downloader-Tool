import express from "express";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";

import { downloadsDir } from "../config/paths.js";
import { createJob, updateJob, jobs, cleanupJobFiles } from "../utils/jobs.js";
import { isValidUrl, isValidFormat, isValidQuality } from "../utils/validators.js";
import {
  getPythonCommandAndBaseArgs,
  runCommand,
} from "../services/ytDlpService.js";
import { getProvider } from "../services/providers/index.js";
import { splitVideoIntoChunks } from "../services/ffmpegService.js";
import { zipFiles } from "../services/zipService.js";

const router = express.Router();

function getFriendlyError(text) {
  const lowerText = text.toLowerCase();

  if (text.includes("No module named yt_dlp")) {
    return "yt-dlp is not installed.";
  }

  if (
    lowerText.includes("ffmpeg is not installed") ||
    lowerText.includes("ffmpeg not found") ||
    lowerText.includes("ffprobe and ffmpeg not found") ||
    lowerText.includes("unable to find ffmpeg") ||
    lowerText.includes("could not start ffmpeg")
  ) {
    return "ffmpeg is missing.";
  }

  if (text.includes("Requested format is not available")) {
    return "Requested quality is not available for this video.";
  }

  if (
    lowerText.includes("sign in to confirm") ||
    lowerText.includes("confirm you’re not a bot") ||
    lowerText.includes("confirm you're not a bot") ||
    lowerText.includes("failed to extract any player response")
  ) {
    return "YouTube blocked this cloud server request (bot verification). This app works 100% locally, or on Render by setting the YOUTUBE_COOKIES environment variable.";
  }

  if (lowerText.includes("this video is unavailable")) {
    return "This video is unavailable or restricted.";
  }

  return null;
}

router.post("/start", async (req, res) => {
  const {
    url,
    format,
    quality = "1080",
    chunk_enabled = false,
    chunk_duration_seconds = 120,
    title,
    thumbnail,
  } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const provider = getProvider(url);
  if (!provider) {
    return res.status(400).json({ error: "Unsupported platform. Please enter a valid YouTube, Facebook, or TikTok URL." });
  }

  if (!isValidFormat(format)) {
    return res.status(400).json({ error: "Invalid format" });
  }

  if (!isValidQuality(quality)) {
    return res.status(400).json({ error: "Invalid quality" });
  }

  const chunkSeconds = Number(chunk_duration_seconds);

  if (
    chunk_enabled &&
    (format !== "mp4" || !Number.isFinite(chunkSeconds) || chunkSeconds < 10)
  ) {
    return res.status(400).json({
      error:
        "Chunking is only supported for MP4 and must be at least 10 seconds.",
    });
  }

  const jobId = createJob();
  const safeName = sanitize(`video-${Date.now()}`) || `video-${Date.now()}`;

  const outputTemplate = path.join(
    downloadsDir,
    `${safeName}-${jobId}.%(ext)s`,
  );

  const { command, baseArgs } = getPythonCommandAndBaseArgs();

  res.json({ jobId });

  try {
    const args = provider.buildDownloadArgs({
      baseArgs,
      outputTemplate,
      format,
      quality,
      url,
    });

    updateJob(jobId, {
      status: "downloading",
      progress: 0,
      mode: chunk_enabled ? "chunked" : "single",
      title: title || "Unknown Title",
      thumbnail: thumbnail || "",
      platform: provider.name,
      format,
      quality,
      speed: "0 KB/s",
      eta: "--:--",
      fileSize: "Unknown size",
    });

    let detectedFile = null;

    await runCommand(
      command,
      args,
      (text) => {
        console.log(text);

        const progressMatch = text.match(/(\d{1,3}(?:\.\d+)?)%/);
        if (progressMatch) {
          const raw = parseFloat(progressMatch[1]);
          const scaled = chunk_enabled ? Math.min(raw * 0.8, 80) : raw;
          updateJob(jobId, { progress: scaled });
        }

        const sizeMatch = text.match(/of\s+(?:~)?([\d.]+[KMG]i?B)/);
        if (sizeMatch) {
          updateJob(jobId, { fileSize: sizeMatch[1] });
        }

        const speedMatch = text.match(/at\s+([\d.]+[KMG]i?B\/s)/);
        if (speedMatch) {
          updateJob(jobId, { speed: speedMatch[1] });
        }

        const etaMatch = text.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?|\d+\s+seconds?)/);
        if (etaMatch) {
          updateJob(jobId, { eta: etaMatch[1] });
        }

        const destinationMatch = text.match(/Destination:\s(.+)/);
        if (destinationMatch) {
          detectedFile = destinationMatch[1].trim();
          updateJob(jobId, { file: detectedFile });
        }

        const mergeMatch = text.match(/Merging formats into "(.+)"/);
        if (mergeMatch) {
          detectedFile = mergeMatch[1].trim();
          updateJob(jobId, { file: detectedFile });
        }

        const extractMatch = text.match(/\[ExtractAudio\] Destination:\s(.+)/);
        if (extractMatch) {
          detectedFile = extractMatch[1].trim();
          updateJob(jobId, { file: detectedFile });
        }
      },
      (text) => {
        console.error(text);

        const friendlyError = getFriendlyError(text);

        if (friendlyError) {
          updateJob(jobId, {
            status: "error",
            error: friendlyError,
          });
        }
      },
    );

    let finalFile = detectedFile;

    if (!finalFile) {
      const files = fs
        .readdirSync(downloadsDir)
        .filter((name) => name.includes(jobId))
        .map((name) => path.join(downloadsDir, name));

      if (files.length > 0) {
        finalFile = files[0];
      }
    }

    if (!finalFile || !fs.existsSync(finalFile)) {
      throw new Error("Download finished but output file was not found.");
    }

    if (chunk_enabled && format === "mp4") {
      updateJob(jobId, {
        status: "splitting",
        progress: 85,
        file: finalFile,
      });

      const chunkDir = path.join(downloadsDir, `${safeName}-${jobId}-chunks`);
      const chunkBaseName =
        sanitize(path.parse(finalFile).name) || `chunk-${jobId}`;

      const chunkFiles = await splitVideoIntoChunks(
        finalFile,
        chunkDir,
        chunkBaseName,
        chunkSeconds,
      );

      updateJob(jobId, {
        status: "archiving",
        progress: 93,
        files: chunkFiles,
      });

      const zipPath = path.join(downloadsDir, `${chunkBaseName}-chunks.zip`);
      await zipFiles(zipPath, chunkFiles);

      updateJob(jobId, {
        status: "finished",
        progress: 100,
        file: zipPath,
        archive: zipPath,
        files: chunkFiles,
      });
    } else {
      updateJob(jobId, {
        status: "finished",
        progress: 100,
        file: finalFile,
      });
    }
  } catch (error) {
    console.error("Download error:", error.message);

    const currentJob = jobs.get(jobId);

    if (!currentJob?.error) {
      updateJob(jobId, {
        status: "error",
        error: error.message || "Download failed.",
      });
    }
  }
});

router.get("/progress/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

router.get("/download/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);

  if (
    !job ||
    job.status !== "finished" ||
    !job.file ||
    !fs.existsSync(job.file)
  ) {
    return res.status(404).send("File not found or expired. Please download again.");
  }

  const ext = path.extname(job.file) || (job.format === "mp3" ? ".mp3" : ".mp4");
  const cleanTitle = (sanitize(job.title || "video").trim().replace(/\s+/g, " ") || "video")
    .replace(/[^\w\s.-]/gi, "");

  const downloadName =
    job.mode === "chunked"
      ? `${cleanTitle}-chunks.zip`
      : `${cleanTitle}${ext}`;

  res.download(job.file, downloadName, (err) => {
    if (err && !res.headersSent) {
      console.error("Download send error:", err);
    }
  });
});

export default router;