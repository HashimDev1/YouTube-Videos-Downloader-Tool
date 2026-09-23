import crypto from "crypto";
import fs from "fs";
import path from "path";
import { downloadsDir } from "../config/paths.js";

export const jobs = new Map();

export function createJob() {
  const id = crypto.randomUUID();

  jobs.set(id, {
    status: "queued",
    progress: 0,
    file: null,
    files: [],
    archive: null,
    error: null,
    mode: "single",
    createdAt: Date.now(),
  });

  return id;
}

export function updateJob(id, patch) {
  const job = jobs.get(id);
  if (!job) return;

  jobs.set(id, { ...job, ...patch, updatedAt: Date.now() });
}

export function cleanupJobFiles(job) {
  const allFiles = [];

  if (job?.file) allFiles.push(job.file);
  if (job?.archive) allFiles.push(job.archive);
  if (Array.isArray(job?.files)) allFiles.push(...job.files);

  for (const file of allFiles) {
    if (file && fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore
      }
    }
  }
}

// Background cleanup for files and jobs older than 1 hour (3600000 ms)
export function runPeriodicCleanup(maxAgeMs = 60 * 60 * 1000) {
  const now = Date.now();

  // Clean old jobs from map
  for (const [id, job] of jobs.entries()) {
    if (now - (job.createdAt || 0) > maxAgeMs) {
      cleanupJobFiles(job);
      jobs.delete(id);
    }
  }

  // Also clean old orphaned files in downloadsDir
  try {
    if (fs.existsSync(downloadsDir)) {
      const files = fs.readdirSync(downloadsDir);
      for (const file of files) {
        const fullPath = path.join(downloadsDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            if (stats.isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(fullPath);
            }
          }
        } catch {
          // ignore stat/unlink errors
        }
      }
    }
  } catch {
    // ignore readdir errors
  }
}

// Run cleanup every 15 minutes
setInterval(() => {
  runPeriodicCleanup();
}, 15 * 60 * 1000);