import { spawn } from "child_process";
import { isWindows, FFMPEG_DIR, COOKIES_FILE, hasCookies } from "../config/paths.js";

export function getPythonCommandAndBaseArgs() {
  if (isWindows) {
    return {
      command: "py",
      baseArgs: ["-3.14", "-m", "yt_dlp"],
    };
  }

  return {
    command: "python3",
    baseArgs: ["-m", "yt_dlp"],
  };
}

export function runCommand(command, args, onStdout, onStderr) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      if (onStdout) onStdout(chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      if (onStderr) onStderr(chunk.toString());
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with code ${code}`));
    });
  });
}

export function runYtDlpJson(url) {
  return new Promise((resolve, reject) => {
    const { command, baseArgs } = getPythonCommandAndBaseArgs();

    const args = [
      ...baseArgs,
      "--js-runtimes",
      "node",
      "--dump-single-json",
      "--no-warnings",
    ];

    if (hasCookies) {
      args.push("--cookies", COOKIES_FILE);
    }

    args.push(url);

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

    child.on("error", (error) => {
      reject(new Error(`Could not start yt-dlp: ${error.message}`));
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

export function buildDownloadArgs({
  baseArgs,
  outputTemplate,
  format,
  quality,
  url,
}) {
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

  return args;
}