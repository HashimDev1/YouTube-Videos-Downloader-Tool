import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sanitize from "sanitize-filename";
import { spawn } from "child_process";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const downloadsDir = process.env.DOWNLOADS_DIR || "/tmp/downloads";
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const jobs = new Map();

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function createJob() {
  const id = crypto.randomUUID();
  jobs.set(id, {
    status: "queued",
    progress: 0,
    file: null,
    error: null,
  });
  return id;
}

function updateJob(id, patch) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch });
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return "--:--";

  const total = Number(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function extractQualities(formats = []) {
  const found = new Set();

  for (const format of formats) {
    const h = format.height;
    if (!h || format.vcodec === "none") continue;

    if (h >= 2160) found.add("2160");
    else if (h >= 1440) found.add("1440");
    else if (h >= 1080) found.add("1080");
    else if (h >= 720) found.add("720");
    else if (h >= 480) found.add("480");
    else if (h >= 360) found.add("360");
    else if (h >= 240) found.add("240");
    else if (h >= 144) found.add("144");
  }

  const sorted = [...found].sort((a, b) => Number(a) - Number(b));
  if (!sorted.includes("best")) sorted.push("best");
  return sorted;
}

function runYtDlpJson(url) {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "py" : "python3";

    const args = [
      "-m",
      "yt_dlp",
      "--js-runtimes",
      "node",
      "--dump-single-json",
      "--no-warnings",
      url,
    ];

    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", () => {
      reject(new Error("Could not start yt-dlp."));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || "Failed to fetch video info."));
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Could not parse video info."));
      }
    });
  });
}

app.post("/api/info", async (req, res) => {
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
    console.error(error);
    return res.status(500).json({
      error: "Could not fetch video details.",
    });
  }
});

app.post("/api/start", (req, res) => {
  const { url, format, quality = "1080" } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["mp4", "mp3"].includes(format)) {
    return res.status(400).json({ error: "Invalid format" });
  }

  if (
    ![
      "144",
      "240",
      "360",
      "480",
      "720",
      "1080",
      "1440",
      "2160",
      "best",
    ].includes(quality)
  ) {
    return res.status(400).json({ error: "Invalid quality" });
  }

  const jobId = createJob();
  const safeName = sanitize(`video-${Date.now()}`);
  const outputTemplate = path.join(
    downloadsDir,
    `${safeName}-${jobId}.%(ext)s`,
  );

  const args = [
    "-m",
    "yt_dlp",
    "--js-runtimes",
    "node",
    "--newline",
    "-o",
    outputTemplate,
  ];

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

  args.push(url);

  const command = process.platform === "win32" ? "py" : "python3";

  const child = spawn(command, args, {
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  updateJob(jobId, { status: "downloading" });

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    console.log(text);

    const progressMatch = text.match(/(\d{1,3}(?:\.\d+)?)%/);
    if (progressMatch) {
      updateJob(jobId, { progress: parseFloat(progressMatch[1]) });
    }

    const destinationMatch = text.match(/Destination:\s(.+)/);
    if (destinationMatch) {
      updateJob(jobId, { file: destinationMatch[1].trim() });
    }

    const mergeMatch = text.match(/Merging formats into "(.+)"/);
    if (mergeMatch) {
      updateJob(jobId, { file: mergeMatch[1].trim() });
    }

    const extractMatch = text.match(/\[ExtractAudio\] Destination:\s(.+)/);
    if (extractMatch) {
      updateJob(jobId, { file: extractMatch[1].trim() });
    }
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    console.error(text);

    if (text.includes("No module named yt_dlp")) {
      updateJob(jobId, {
        status: "error",
        error: "yt-dlp is not installed.",
      });
    } else if (text.toLowerCase().includes("ffmpeg")) {
      updateJob(jobId, {
        status: "error",
        error: "ffmpeg is missing.",
      });
    } else if (text.includes("Requested format is not available")) {
      updateJob(jobId, {
        status: "error",
        error: "Requested quality is not available for this video.",
      });
    }
  });

  child.on("close", (code) => {
    const job = jobs.get(jobId);

    let finalFile = job?.file;
    if (!finalFile) {
      const files = fs
        .readdirSync(downloadsDir)
        .filter((name) => name.includes(jobId))
        .map((name) => path.join(downloadsDir, name));

      if (files.length > 0) {
        finalFile = files[0];
      }
    }

    if (code === 0 && finalFile && fs.existsSync(finalFile)) {
      updateJob(jobId, {
        status: "finished",
        progress: 100,
        file: finalFile,
      });
    } else {
      const currentJob = jobs.get(jobId);
      if (!currentJob?.error) {
        updateJob(jobId, {
          status: "error",
          error: "Download failed.",
        });
      }
    }
  });

  child.on("error", () => {
    updateJob(jobId, {
      status: "error",
      error: "Could not start Python/yt-dlp.",
    });
  });

  res.json({ jobId });
});

app.get("/api/progress/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

app.get("/api/download/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);

  if (
    !job ||
    job.status !== "finished" ||
    !job.file ||
    !fs.existsSync(job.file)
  ) {
    return res.status(400).send("File not ready");
  }

  res.download(job.file, (err) => {
    if (err) {
      console.error("Download send error:", err);
      return;
    }

    fs.unlink(job.file, (unlinkErr) => {
      if (unlinkErr) {
        console.error("Failed to delete file:", unlinkErr);
      }
    });

    jobs.delete(jobId);
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
