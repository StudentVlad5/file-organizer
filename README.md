# File Organizer CLI

A command-line interface (CLI) utility for analyzing, sorting, finding duplicates, and cleaning up the file system. It is written in Node.js and utilizes an event- and stream-based architecture to efficiently handle large files.

## 1. Technical Features and Architecture

### Recursive directory scanning with detailed statistics:

- Total number of files
- File sizes
- File types
- File age analysis

### Duplicate file detection:

- Calculates SHA-256 hashes
- Identifies files with identical content regardless of filename
- Automatic file organization

### Copies and sorts files into categorized folders:

- Documents
- Images
- Archives
- Code
- Videos
- Other

### Directory cleanup:

- Finds files older than a specified number of days
- Supports Dry Run mode for previewing files before deletion

### Event-driven architecture:

- Built with Node.js EventEmitter
- Each CLI command is implemented as a separate class with progress events
- Each module is a distinct class extending `EventEmitter` that emits progress events. These events are consumed by the CLI to render a dynamic ASCII progress bar (████░░░░) in the console.

### Robust error handling:

- Uses try...catch for all file operations
- Handles filesystem errors with descriptive messages based on error codes
- The program checks for specific Node.js system error codes (e.g., ENOENT for non-existent folders, EACCES for locked files or folders lacking access rights) and outputs informative messages, terminates the process with exit code 1.

### Efficient processing of large files:

- Uses Node.js Streams for files larger than 10 MB
- Avoids loading large files entirely into memory

## 2. Project structure

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

## 3. Installation instructions

Ensure that Node.js (version 16 or higher) is installed.
Create a project folder and move the files into it, following the required structure.
Run the initialization command in the terminal (at the root of the project folder):

```bash
npm install
```

## 4. Usage and command examples

You can run commands in two ways: using `npm run <command> -- <arguments>` or directly via Node.js using `node file-organizer.js`. To avoid issues with paths containing spaces, enclose such paths in quotation marks.

### scan - Directory Analysis

Recursively traverses the specified directory and gathers statistics including the file count, total size, file types, modification age distribution, the three largest files, and the oldest file.

Syntax:

```bash
node file-organizer.js scan "<path>"
```

Example:

```bash
node file-organizer.js scan "C:\Users\User\Downloads"
```

### duplicates - Duplicate Detection

It searches for files with identical content by calculating SHA-256 hashes using read streams, which avoids overloading system memory with large files. It displays information about duplicate groups and calculates the amount of wasted disk space.

Syntax:

```bash
node file-organizer.js duplicates "<path>"
```

Example:

```bash
node file-organizer.js duplicates "C:\Users\User\Downloads"
```

### organize - File Organization

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

### cleanup - Cleanup

Finds files older than a specified number of days (based on their last modification time (mtime)).

Dry Run (default): without the `--confirm` flag, the utility simply lists the files matching the criteria and shows the total amount of disk space that would be freed.

```bash
node file-organizer.js cleanup "<path>" --older-than <number_of_days> [--confirm]
```

Example:

View-only (Dry run)

```bash
node file-organizer.js cleanup "C:\Users\User\Downloads" --older-than 90
```

Actual removal

```bash
node file-organizer.js cleanup "C:\Users\User\Downloads" --older-than 90 --confirm
```

## 5. Technologies

- Node.js
- File System (fs)
- Streams
- Path
- Crypto (SHA-256)
- Events (EventEmitter)
- JavaScript (ES6+)

## 6. License

This project is intended for educational purposes.
