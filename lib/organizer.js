import { EventEmitter } from "node:events";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { getAllFiles } from "./utils.js";

const CATEGORIES = {
  Documents: [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx"],
  Images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"],
  Archives: [".zip", ".rar", ".tar", ".gz", ".7z"],
  Code: [".js", ".py", ".java", ".cpp", ".html", ".css", ".json"],
  Videos: [".mp4", ".avi", ".mkv", ".mov", ".webm"],
  Other: [],
};

const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export class Organizer extends EventEmitter {
  getCategory(ext) {
    for (const [category, extensions] of Object.entries(CATEGORIES)) {
      if (extensions.includes(ext.toLowerCase())) return category;
    }
    return "Other";
  }

  async getUniqueTargetPath(targetDir, category, fileName) {
    let targetPath = path.join(targetDir, category, fileName);
    const parsed = path.parse(fileName);
    let counter = 1;

    while (true) {
      try {
        await fsPromises.access(targetPath);

        const newName = `${parsed.name}(${counter})${parsed.ext}`;
        targetPath = path.join(targetDir, category, newName);
        counter++;
      } catch {
        break;
      }
    }
    return targetPath;
  }

  async organize(sourceDir, targetDir) {
    this.emit("organize-start", { sourceDir, targetDir });

    const allFilePaths = await getAllFiles(sourceDir);
    const totalFiles = allFilePaths.length;

    // Створюємо папки для категорій
    for (const category of Object.keys(CATEGORIES)) {
      await fsPromises.mkdir(path.join(targetDir, category), {
        recursive: true,
      });
    }

    const summary = {
      totalCopied: 0,
      totalSize: 0,
      categories: {},
    };
    for (const cat of Object.keys(CATEGORIES)) summary.categories[cat] = 0;

    for (let i = 0; i < totalFiles; i++) {
      const srcPath = allFilePaths[i];
      try {
        const stat = await fsPromises.stat(srcPath);
        const ext = path.extname(srcPath);
        const category = this.getCategory(ext);
        const baseName = path.basename(srcPath);

        const destPath = await this.getUniqueTargetPath(
          targetDir,
          category,
          baseName,
        );

        this.emit("copy-start", { file: baseName });

        if (stat.size >= LARGE_FILE_THRESHOLD) {
          await pipeline(
            fs.createReadStream(srcPath),
            fs.createWriteStream(destPath),
          );
        } else {
          await fsPromises.copyFile(srcPath, destPath);
        }

        summary.totalCopied++;
        summary.totalSize += stat.size;
        summary.categories[category]++;

        this.emit("copy-complete", { current: i + 1, total: totalFiles });
      } catch (error) {
        this.emit("copy-error", {
          file: path.basename(srcPath),
          error: error.message,
        });
      }
    }

    this.emit("organization-complete", summary);
  }
}
