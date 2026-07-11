import { EventEmitter } from "node:events";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { getAllFiles } from "./utils.js";

export class DuplicateFinder extends EventEmitter {
  calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }

  async find(directory) {
    this.emit("search-start", { directory });

    const allFilePaths = await getAllFiles(directory);
    const totalFiles = allFilePaths.length;
    const hashMap = new Map();

    for (let i = 0; i < totalFiles; i++) {
      const filePath = allFilePaths[i];
      try {
        const stat = await fsPromises.stat(filePath);
        const hash = await this.calculateHash(filePath);

        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash).push({ path: filePath, size: stat.size });
      } catch (e) {}
      this.emit("file-processed", { current: i + 1, total: totalFiles });
    }

    const duplicates = new Map();
    let totalWastedSpace = 0;

    for (const [hash, files] of hashMap.entries()) {
      if (files.length > 1) {
        duplicates.set(hash, files);
        const sizePerFile = files[0].size;
        totalWastedSpace += sizePerFile * (files.length - 1);
      }
    }

    this.emit("duplicates-found", { duplicates, totalWastedSpace });
  }
}
