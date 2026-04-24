import fs from "fs";
import path from "path";
import archiver from "archiver";

export function zipFiles(zipPath, files) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);

    for (const file of files) {
      archive.file(file, { name: path.basename(file) });
    }

    archive.finalize();
  });
}