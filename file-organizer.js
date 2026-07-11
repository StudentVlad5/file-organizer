import readline from "readline";
import { Scanner } from "./lib/scanner.js";
import { DuplicateFinder } from "./lib/duplicates.js";
import { Organizer } from "./lib/organizer.js";
import { Cleanup } from "./lib/cleanup.js";
import { formatSize, drawProgressBar } from "./lib/utils.js";

const args = process.argv.slice(2);
const command = args[0];

function printProgress(text) {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(text);
}

async function main() {
  try {
    if (!command) {
      console.log(
        "Error: Missing command. Choose scan, duplicates, organize or cleanup.",
      );
      process.exit(1);
    }

    switch (command) {
      case "scan": {
        const dir = args[1];
        if (!dir) {
          console.error("Error: Path required.");
          process.exit(1);
        }

        const scanner = new Scanner();
        scanner.on("scan-start", (d) =>
          console.log(`Scanning: ${d.directory}`),
        );
        scanner.on("file-found", (p) =>
          printProgress(`Processing... ${drawProgressBar(p.current, p.total)}`),
        );
        scanner.on("scan-complete", (stats) => {
          console.log("\n\n Scan Results:");
          console.log("<=====================================>");
          console.log(`Total files: ${stats.totalFiles}`);
          console.log(`Total size:  ${formatSize(stats.totalSize)}`);
          console.log("\nBy File Type:");

          const sortedTypes = [...stats.byType.entries()].sort(
            (a, b) => b[1].count - a[1].count,
          );
          for (const [ext, data] of sortedTypes) {
            console.log(
              `  ${ext.padEnd(7)} ${data.count.toString().padEnd(5)} files   ${formatSize(data.size)}`,
            );
          }

          console.log("\nFile Age:");
          console.log(`  Last 7 days:    ${stats.age.last7} files`);
          console.log(`  Last 30 days:   ${stats.age.last30} files`);
          console.log(`  Older than 90:  ${stats.age.older90} files`);

          console.log("\nLargest files:");
          stats.largest.forEach((f, i) =>
            console.log(
              `  ${i + 1}. ${f.name.padEnd(25)} ${formatSize(f.size)}`,
            ),
          );

          if (stats.oldest) {
            console.log(
              `\nOldest file: ${stats.oldest.name} (modified ${stats.oldest.daysAgo} days ago)`,
            );
          }
        });

        await scanner.scan(dir);
        break;
      }

      case "duplicates": {
        const dir = args[1];
        if (!dir) {
          console.error("Error: Path required.");
          process.exit(1);
        }

        const finder = new DuplicateFinder();
        finder.on("search-start", (d) =>
          console.log(`Searching for duplicates in: ${d.directory}`),
        );
        finder.on("file-processed", (p) =>
          printProgress(
            `Calculating hashes... ${drawProgressBar(p.current, p.total)}`,
          ),
        );
        finder.on("duplicates-found", ({ duplicates, totalWastedSpace }) => {
          console.log(
            `\n\nFound ${duplicates.size} duplicate groups (${formatSize(totalWastedSpace)} wasted):\n`,
          );

          let index = 1;
          for (const [hash, files] of duplicates.entries()) {
            console.log("<================================>");
            console.log(
              `Group ${index} (${files.length} copies, ${formatSize(files[0].size)} each):`,
            );
            console.log(`  SHA-256: ${hash.substring(0, 12)}...`);
            files.forEach((f) => console.log(`  ${f.path}`));
            const groupWasted = files[0].size * (files.length - 1);
            console.log(`  Wasted space: ${formatSize(groupWasted)}`);
            index++;
          }
          console.log("<================================>");
          console.log(` Total wasted space: ${formatSize(totalWastedSpace)}`);
        });

        await finder.find(dir);
        break;
      }

      case "organize": {
        const src = args[1];
        const outIdx = args.indexOf("--output");
        const target = outIdx !== -1 ? args[outIdx + 1] : null;

        if (!src || !target) {
          console.error(
            "Error: Usage: node file-organizer.js organize <source> --output <target>",
          );
          process.exit(1);
        }

        const organizer = new Organizer();
        organizer.on("organize-start", (d) => {
          console.log(`Organizing: ${d.sourceDir}`);
          console.log(
            `Target: ${d.targetDir}\n\nCreating folders & copying files...`,
          );
        });
        organizer.on("copy-complete", (p) =>
          printProgress(`Progress: ${drawProgressBar(p.current, p.total)}`),
        );
        organizer.on("copy-error", (err) =>
          console.error(`\n Error copying ${err.file}: ${err.error}`),
        );
        organizer.on("organization-complete", (summary) => {
          console.log("\n\n Organization complete!\n\nSummary:");
          for (const [cat, count] of Object.entries(summary.categories)) {
            console.log(
              `  ${cat.padEnd(12)}: ${count.toString().padEnd(4)} files → Organized/${cat}/`,
            );
          }
          console.log(
            `\nTotal copied: ${summary.totalCopied} files (${formatSize(summary.totalSize)})`,
          );
        });

        await organizer.organize(src, target);
        break;
      }

      case "cleanup": {
        const dir = args[1];
        const ageIdx = args.indexOf("--older-than");
        const threshold = ageIdx !== -1 ? parseInt(args[ageIdx + 1], 10) : null;
        const isConfirm = args.includes("--confirm");

        if (!dir || isNaN(threshold)) {
          console.error(
            "Error: Usage: node file-organizer.js cleanup <path> --older-than <days> [--confirm]",
          );
          process.exit(1);
        }

        const cleanup = new Cleanup();
        cleanup.on("cleanup-start", (d) =>
          console.log(
            `Cleanup: ${d.directory}\nLooking for files older than ${d.daysThreshold} days...\n`,
          ),
        );

        const foundFiles = [];
        cleanup.on("file-found", (f) => {
          foundFiles.push(f);
          console.log(
            `${f.name}\n  Size: ${formatSize(f.size)}\n  Modified: ${f.daysOld} days ago (${f.mtimeFormatted})\n`,
          );
        });

        cleanup.on("deletion-start", (d) => {
          console.log(
            ` DELETING ${d.total} files (${formatSize(d.totalSize)}). This action cannot be undone!\n`,
          );
        });
        cleanup.on("file-deleted", (p) =>
          printProgress(`Deleting... ${drawProgressBar(p.current, p.total)}`),
        );

        cleanup.on("cleanup-complete", (res) => {
          if (res.mode === "dry-run") {
            console.log("<================================>");
            console.log(
              `Total: ${res.files.length} files (${formatSize(res.totalSize)})`,
            );
            console.log("\n  DRY RUN MODE: No files were deleted.");
            console.log(
              "To actually delete these files, run with --confirm flag.",
            );
          } else {
            console.log(
              `\n\n Cleanup complete!\ Deleted: ${res.deletedCount} files (${formatSize(res.totalSize)} freed)`,
            );
          }
        });

        await cleanup.process(dir, threshold, isConfirm);
        break;
      }

      default:
        console.error(` Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    if (error.message.includes("ENOENT")) {
      console.error(`\n Error: Directory or file not found.`);
    } else if (error.message.includes("EACCES")) {
      console.error(`\n Error: Permission denied.`);
    } else {
      console.error(`\n Unexpected error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
