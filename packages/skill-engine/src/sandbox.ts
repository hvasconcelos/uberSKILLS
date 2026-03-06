import { execFile } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import type { SandboxFileEntry, SandboxToolCall } from "@uberskills/types";
import AdmZip from "adm-zip";
import archiver from "archiver";

/** Maximum time (ms) a single bash command may run before being killed. */
const COMMAND_TIMEOUT_MS = 10_000;

/** Maximum stdout + stderr bytes per command. */
const MAX_OUTPUT_BYTES = 64 * 1024;

/** Maximum input zip size in bytes (10 MB). */
export const MAX_ZIP_SIZE = 10 * 1024 * 1024;

/** Maximum number of files allowed in an input zip. */
export const MAX_ZIP_FILES = 200;

/** Maximum individual file size within the zip (1 MB). */
export const MAX_FILE_SIZE = 1 * 1024 * 1024;

/** Commands that could escape the sandbox or damage the host system. */
const BLOCKED_COMMANDS = new Set([
  "sudo",
  "su",
  "chroot",
  "mount",
  "umount",
  "mkfs",
  "dd",
  "reboot",
  "shutdown",
  "systemctl",
  "launchctl",
  "curl",
  "wget",
  "ssh",
  "scp",
  "sftp",
  "nc",
  "ncat",
  "nmap",
  "open",
  "osascript",
  "pbcopy",
  "pbpaste",
  "docker",
  "podman",
  "kill",
  "killall",
  "pkill",
]);

/** Text file extensions for the file index `isText` flag. */
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".csv",
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".sh",
  ".sql",
  ".rs",
  ".go",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".scala",
  ".zig",
  ".lua",
  ".vim",
  ".conf",
  ".cfg",
  ".ini",
  ".env",
  ".gitignore",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
  ".babelrc",
  "Makefile",
  "Dockerfile",
  "Gemfile",
  "Rakefile",
  "Procfile",
]);

/** Check if a file path has a text extension. */
function isTextFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  for (const ext of TEXT_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  // Files without extensions that are often text (e.g. Makefile, Dockerfile)
  const basename = filePath.split("/").pop() ?? "";
  return TEXT_EXTENSIONS.has(basename);
}

/**
 * Recursively walk a directory tree and collect file entries.
 */
async function walkDir(dir: string, root: string): Promise<SandboxFileEntry[]> {
  const entries: SandboxFileEntry[] = [];
  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);
    const relPath = relative(root, fullPath);

    if (item.isDirectory()) {
      const nested = await walkDir(fullPath, root);
      entries.push(...nested);
    } else if (item.isFile()) {
      const info = await stat(fullPath);
      entries.push({
        path: relPath,
        size: info.size,
        isText: isTextFile(relPath),
      });
    }
  }

  return entries;
}

/**
 * Sandbox provides an isolated temporary filesystem for skill testing.
 *
 * It extracts a zip archive into a temp directory, executes bash commands
 * scoped to that directory, and can zip up the final state for output.
 */
export class Sandbox {
  private root = "";
  private log: SandboxToolCall[] = [];
  private initialized = false;

  /** Returns the absolute path to the sandbox root directory. */
  getRoot(): string {
    return this.root;
  }

  /** Returns the ordered list of bash commands executed so far. */
  getLog(): SandboxToolCall[] {
    return [...this.log];
  }

  /**
   * Initialize the sandbox by extracting a zip buffer to a temp directory.
   *
   * @throws if the zip exceeds size or file count limits.
   */
  async init(zipBuffer: Buffer): Promise<void> {
    if (zipBuffer.length > MAX_ZIP_SIZE) {
      throw new Error(`Zip file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024} MB`);
    }

    this.root = join(
      tmpdir(),
      `uberskills-sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    await mkdir(this.root, { recursive: true });

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // Validate entry count
    const fileCount = entries.filter((e) => !e.isDirectory).length;
    if (fileCount > MAX_ZIP_FILES) {
      await this.cleanup();
      throw new Error(`Zip contains ${fileCount} files, exceeding limit of ${MAX_ZIP_FILES}`);
    }

    // Validate individual file sizes and paths
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      // Path traversal check
      const resolved = resolve(this.root, entry.entryName);
      if (!resolved.startsWith(this.root)) {
        await this.cleanup();
        throw new Error(`Path traversal detected: ${entry.entryName}`);
      }

      if (entry.header.size > MAX_FILE_SIZE) {
        await this.cleanup();
        throw new Error(
          `File "${entry.entryName}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        );
      }
    }

    zip.extractAllTo(this.root, true);
    this.initialized = true;
  }

  /**
   * Execute a bash command within the sandbox directory.
   *
   * @returns Combined stdout + stderr output.
   * @throws if the command is blocked, times out, or the sandbox is not initialized.
   */
  async exec(command: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }

    // Extract the first word to check against the blocklist
    const firstWord = command.trim().split(/\s/)[0] ?? "";
    if (BLOCKED_COMMANDS.has(firstWord)) {
      const msg = `Blocked command: "${firstWord}" is not allowed in the sandbox`;
      this.log.push({ command, output: msg, timestamp: Date.now(), durationMs: 0 });
      return msg;
    }

    // Also block piped commands that start with blocked commands
    const pipeSegments = command.split(/[|;&&]/).map((s) => s.trim());
    for (const segment of pipeSegments) {
      const segFirst = segment.split(/\s/)[0] ?? "";
      if (BLOCKED_COMMANDS.has(segFirst)) {
        const msg = `Blocked command: "${segFirst}" is not allowed in the sandbox`;
        this.log.push({ command, output: msg, timestamp: Date.now(), durationMs: 0 });
        return msg;
      }
    }

    const startMs = Date.now();

    return new Promise((resolve) => {
      execFile(
        "/bin/bash",
        ["-c", command],
        {
          cwd: this.root,
          timeout: COMMAND_TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          env: {
            ...process.env,
            HOME: this.root,
            PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
            TMPDIR: this.root,
            LANG: "en_US.UTF-8",
            TERM: "xterm-256color",
          },
        },
        (err: Error | null, stdout: string, stderr: string) => {
          const durationMs = Date.now() - startMs;
          let output = stdout ?? "";
          if (stderr) {
            output = output ? `${output}\n${stderr}` : stderr;
          }
          output = output.trim();

          if (err && !output) {
            output = err.message;
          }
          if (!output) {
            output = "(no output)";
          }

          this.log.push({ command, output, timestamp: startMs, durationMs });
          resolve(output);
        },
      );
    });
  }

  /**
   * Build a file index of the current sandbox state.
   */
  async buildFileIndex(): Promise<SandboxFileEntry[]> {
    if (!this.initialized) return [];
    return walkDir(this.root, this.root);
  }

  /**
   * Create a zip archive of the current sandbox directory state.
   */
  async toZip(): Promise<Buffer> {
    if (!this.initialized) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.directory(this.root, false);
    await archive.finalize();

    return Buffer.concat(chunks);
  }

  /**
   * Remove the temporary sandbox directory.
   * Always call this when done, even if errors occurred.
   */
  async cleanup(): Promise<void> {
    if (this.root) {
      await rm(this.root, { recursive: true, force: true }).catch(() => {});
      this.root = "";
      this.initialized = false;
    }
  }
}

/**
 * Build a file index from a zip buffer without extracting to disk.
 * Used when storing a sandbox state to generate the file index metadata.
 */
export function buildFileIndexFromZip(zipBuffer: Buffer): SandboxFileEntry[] {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const result: SandboxFileEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    result.push({
      path: entry.entryName,
      size: entry.header.size,
      isText: isTextFile(entry.entryName),
    });
  }

  return result;
}

/**
 * Read a text file from a zip buffer by its path.
 * Used to display text file contents for diffing without extracting the full zip.
 */
export function readTextFileFromZip(zipBuffer: Buffer, filePath: string): string | null {
  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntry(filePath);
  if (!entry || entry.isDirectory) return null;
  return entry.getData().toString("utf-8");
}
