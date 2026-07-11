import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { getAllFiles } from "./utils.js";

export class Cleanup extends EventEmitter {
  async process(directory, daysThreshold, isConfirm) {
    this.emit("cleanup-start", { directory, daysThreshold, isConfirm });

    const allFilePaths = await getAllFiles(directory);
    const now = Date.now();
    const msThreshold = daysThreshold * 24 * 60 * 60 * 1000;

    const filesToDelete = [];
    let totalSize = 0;

    for (const filePath of allFilePaths) {
      try {
        const stat = await fs.stat(filePath);
        const ageMs = now - stat.mtime.getTime();

        if (ageMs > msThreshold) {
          const daysOld = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          const fileData = {
            path: filePath,
            name: path.basename(filePath),
            size: stat.size,
            daysOld,
            mtimeFormatted: stat.mtime.toISOString().split("T")[0],
          };
          filesToDelete.push(fileData);
          totalSize += stat.size;
          this.emit("file-found", fileData);
        }
      } catch (e) {}
    }

    if (!isConfirm) {
      this.emit("cleanup-complete", {
        mode: "dry-run",
        files: filesToDelete,
        totalSize,
      });
      return;
    }

    this.emit("deletion-start", { total: filesToDelete.length, totalSize });

    let deletedCount = 0;
    for (let i = 0; i < filesToDelete.length; i++) {
      const file = filesToDelete[i];
      try {
        await fs.unlink(file.path);
        deletedCount++;
        this.emit("file-deleted", {
          current: i + 1,
          total: filesToDelete.length,
        });
      } catch (error) {
        this.emit("error", { file: file.name, error: error.message });
      }
    }

    this.emit("cleanup-complete", {
      mode: "confirmed",
      deletedCount,
      totalSize,
    });
  }
}
