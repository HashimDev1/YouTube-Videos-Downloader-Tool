import crypto from "crypto";
import fs from "fs";

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
  });

  return id;
}

export function updateJob(id, patch) {
  const job = jobs.get(id);
  if (!job) return;

  jobs.set(id, { ...job, ...patch });
}

export function cleanupJobFiles(job) {
  const allFiles = [];

  if (job?.file) allFiles.push(job.file);
  if (job?.archive) allFiles.push(job.archive);
  if (Array.isArray(job?.files)) allFiles.push(...job.files);

  for (const file of allFiles) {
    if (file && fs.existsSync(file)) {
      fs.unlink(file, () => {});
    }
  }
}