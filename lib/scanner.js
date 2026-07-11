import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { getAllFiles } from "./utils.js";

export class Scanner extends EventEmitter {
  async scan(directory) {
    this.emit("scan-start", { directory });

    const allFilePaths = await getAllFiles(directory);
    const totalFiles = allFilePaths.length;

    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: new Map(),
      age: { last7: 0, last30: 0, older90: 0 },
      largest: [],
      oldest: null,
    };

    const now = Date.now();

    for (let i = 0; i < totalFiles; i++) {
      const filePath = allFilePaths[i];
      try {
        const fileStat = await fs.stat(filePath);
        const size = fileStat.size;
        const mtime = fileStat.mtime;
        const ext = path.extname(filePath).toLowerCase() || "(no ext)";

        stats.totalFiles++;
        stats.totalSize += size;

        // По типах
        if (!stats.byType.has(ext)) {
          stats.byType.set(ext, { count: 0, size: 0 });
        }
        const typeData = stats.byType.get(ext);
        typeData.count++;
        typeData.size += size;

        // По віку
        const diffDays = (now - mtime.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) stats.age.last7++;
        if (diffDays <= 30) stats.age.last30++;
        if (diffDays > 90) stats.age.older90++;

        const fileName = path.basename(filePath);

        // Топ найбільших
        stats.largest.push({ name: fileName, size });
        stats.largest.sort((a, b) => b.size - a.size);
        if (stats.largest.length > 3) stats.largest.pop();

        // Найстаріший
        if (!stats.oldest || mtime < stats.oldest.mtime) {
          stats.oldest = {
            name: fileName,
            mtime,
            daysAgo: Math.floor(diffDays),
          };
        }

        this.emit("file-found", { current: i + 1, total: totalFiles });
      } catch (e) {
        continue;
      }
    }

    this.emit("scan-complete", stats);
  }
}
