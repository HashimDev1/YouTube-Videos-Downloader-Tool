import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { FFMPEG_EXE } from "../config/paths.js";

export function splitVideoIntoChunks(inputFile, outputDir, safeBaseName, chunkSeconds) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(outputDir, { recursive: true });

    const ext = path.extname(inputFile) || ".mp4";
    const pattern = path.join(outputDir, `${safeBaseName}-part-%03d${ext}`);

    const ffmpegArgs = [
      "-i",
      inputFile,
      "-c",
      "copy",
      "-map",
      "0",
      "-f",
      "segment",
      "-segment_time",
      String(chunkSeconds),
      "-reset_timestamps",
      "1",
      pattern,
    ];

    const child = spawn(FFMPEG_EXE, ffmpegArgs, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stdout.on("data", () => {});

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", () => {
      reject(new Error("Could not start ffmpeg. Check FFMPEG_EXE path."));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || "ffmpeg split failed."));
      }

      const files = fs
        .readdirSync(outputDir)
        .filter((name) => name.startsWith(`${safeBaseName}-part-`))
        .sort()
        .map((name) => path.join(outputDir, name));

      if (!files.length) {
        return reject(new Error("No chunk files were created."));
      }

      resolve(files);
    });
  });
}