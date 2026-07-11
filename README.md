# File Organizer CLI

A command-line interface (CLI) utility for analyzing, sorting, finding duplicates, and cleaning up the file system. It is written in Node.js and utilizes an event- and stream-based architecture to efficiently handle large files.

## Project structure

```bash
file-organizer/
├── package.json
├── .gitignore
├── README.md
├── file-organizer.js
└── lib/
    ├── utils.js
    ├── scanner.js
    ├── duplicates.js
    ├── organizer.js
    └── cleanup.js
```

## Installation instructions

Ensure that Node.js (version 16 or higher) is installed.
Create a project folder and move the files into it, following the required structure.
Run the initialization command in the terminal (at the root of the project folder):

```bash
npm install
```

## Usage and command examples

You can run commands in two ways: using `npm run <command> -- <arguments>` or directly via Node.js using `node file-organizer.js`. To avoid issues with paths containing spaces, enclose such paths in quotation marks.

### 1. scan - Directory Analysis

Recursively traverses the specified directory and gathers statistics including the file count, total size, file types, modification age distribution, the three largest files, and the oldest file.

Syntax:

```bash
node file-organizer.js scan "<path>"
```

Example:

```bash
node file-organizer.js scan "C:\Users\User\Downloads"
```

### 2. duplicates - Duplicate Detection

It searches for files with identical content by calculating SHA-256 hashes using read streams, which avoids overloading system memory with large files. It displays information about duplicate groups and calculates the amount of wasted disk space.

Syntax:

```bash
node file-organizer.js duplicates "<path>"
```

Example:

```bash
node file-organizer.js duplicates "C:\Users\User\Downloads"
```

### 3. organize - File Organization

Copies files from the source directory to the destination directory while preserving the originals, automatically sorting them into categories: Documents, Images, Archives, Code, Videos, and Other.
Small files (<10 MB) are copied using the system method.
Large files (≥10 MB) are copied using `stream/promises.pipeline()`.
In the event of a name conflict, files are automatically renamed using the pattern `file(1).pdf`, `file(2).pdf`.

Syntax:

```bash
node file-organizer.js organize "<source-path>" --output "<destination-path>"
```

Example:

```bash
node file-organizer.js organize "C:\Users\User\Downloads" --output "C:\Users\User\Desktop\Organized"
```

### 4. cleanup - Cleanup

Finds files older than a specified number of days (based on their last modification time (mtime)).

Dry Run (default): without the `--confirm` flag, the utility simply lists the files matching the criteria and shows the total amount of disk space that would be freed.

```bash
node file-organizer.js cleanup "<path>" --older-than <number_of_days> [--confirm]
```

Example:

#### View-only (Dry run)

```bash
node file-organizer.js cleanup "C:\Users\User\Downloads" --older-than 90
```

#### Actual removal

```bash
node file-organizer.js cleanup "C:\Users\User\Downloads" --older-than 90 --confirm
```

## Technical Features and Architecture

### Error Handling

The business logic for each command is completely decoupled from the information display (interface). Each module is a distinct class extending `EventEmitter` that emits progress events. These events are consumed by the CLI to render a dynamic ASCII progress bar (████░░░░) in the console.

### Error Handling

File reading for hash calculations and the copying of files larger than 10 MB are implemented using `fs.createReadStream()` and `fs.createWriteStream()` data streams. This prevents loading large volumes of data into RAM.

### Error Handling

File operations are wrapped in try...catch blocks. The program checks for specific Node.js system error codes (e.g., ENOENT for non-existent folders, EACCES for locked files or folders lacking access rights) and outputs informative messages, terminates the process with exit code 1.
