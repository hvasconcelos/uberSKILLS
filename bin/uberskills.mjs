#!/usr/bin/env node

// uberSKILLS entry point script (bin/uberskills.mjs)
// This script manages installation, upgrading, and launching of the uberSKILLS local server application.

import { execSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import ora from "ora";

// ---
// Constants

const VERSION = "0.10.0"; // Current version of this launcher
const REPO_URL = "https://github.com/uberskillsdev/uberskills.git"; // Upstream repository for app code
const UBERSKILLS_HOME = join(homedir(), ".uberskills"); // Where all binaries, data, etc live
const APP_DIR = join(UBERSKILLS_HOME, "app"); // Cloned app location
const VERSION_FILE = join(UBERSKILLS_HOME, ".version"); // File to store installed version
const PNPM_VERSION = "9.15.4"; // Explicit pnpm version for reproducible installs

// Run a command asynchronously with suppressed output. Resolves on success, rejects with stderr.
function runQuiet(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["-c", cmd], { stdio: "pipe", ...opts });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

// ---
// Parse CLI arguments from process.argv, supporting --host, --port, --data-dir, etc.
function parseArgs(argv) {
  const args = {
    port: 3000,
    host: "localhost",
    dataDir: null,
    help: false,
    version: false,
    reset: false,
    debug: false,
  };

  // Start at argv[2] to skip 'node' and script path
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--port":
        args.port = parseInt(argv[++i], 10);
        if (Number.isNaN(args.port)) {
          console.error("Error: --port requires a valid number");
          process.exit(1);
        }
        break;
      case "--host":
        args.host = argv[++i];
        if (!args.host) {
          console.error("Error: --host requires a value");
          process.exit(1);
        }
        break;
      case "--data-dir":
        args.dataDir = argv[++i];
        if (!args.dataDir) {
          console.error("Error: --data-dir requires a path");
          process.exit(1);
        }
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--version":
      case "-v":
        args.version = true;
        break;
      case "--reset":
        args.reset = true;
        break;
      case "-d":
      case "--debug":
        args.debug = true;
        break;
      default:
        console.error(`Unknown option: ${argv[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  return args;
}

// Print usage info for CLI users.
function printUsage() {
  console.log(`
uberSKILLS v${VERSION}

Usage: uberskills [options]

Options:
  --port <number>    Port to run on (default: 3000)
  --host <string>    Host to bind to (default: localhost)
  --data-dir <path>  Custom data directory (default: ~/.uberskills/data/)
  --reset            Delete cached install and re-setup
  -d, --debug        Enable debug log level
  --version, -v      Show version
  --help, -h         Show this help message
`);
}

// Ensure that Node.js and git are available, error otherwise.
function checkPrerequisites() {
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0], 10);
  if (major < 20) {
    console.error(`Error: Node.js >= 20 required (found v${nodeVersion})`);
    process.exit(1);
  }

  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    console.error("Error: git is required but not found in PATH");
    console.error("Install git: https://git-scm.com/downloads");
    process.exit(1);
  }
}

// If the app is not installed (or is outdated, or --reset), clone and build it.
// Installs and configures pnpm via corepack as well.
async function ensureInstalled(reset) {
  // Ensure the main directory exists for caching installs and other files
  mkdirSync(UBERSKILLS_HOME, { recursive: true });

  // If --reset or forced reinstall, remove any cached install and version record
  if (reset && existsSync(UBERSKILLS_HOME)) {
    console.log("Resetting uberSKILLS installation...");
    rmSync(APP_DIR, { recursive: true, force: true });
    rmSync(VERSION_FILE, { force: true });
  }

  // If version is as expected, do nothing
  if (existsSync(VERSION_FILE)) {
    const cachedVersion = readFileSync(VERSION_FILE, "utf-8").trim();
    if (cachedVersion === VERSION) {
      return;
    }
    // Otherwise, remove the old app in preparation for download
    console.log(`Upgrading uberSKILLS from v${cachedVersion} to v${VERSION}...`);
    rmSync(APP_DIR, { recursive: true, force: true });
  }

  console.log(`\nSetting up uberSKILLS v${VERSION} (first run, this may take a few minutes)...\n`);

  async function step(label, successMsg, fn) {
    const spinner = ora(label).start();
    try {
      await fn();
      spinner.succeed(successMsg);
    } catch (err) {
      spinner.fail(label.replace(/\.{3}$/, " failed"));
      console.error(`\n${err.message}`);
      process.exit(1);
    }
  }

  await step("Cloning repository...", "Repository cloned", () =>
    runQuiet(`git clone --depth 1 --branch v${VERSION} ${REPO_URL} ${APP_DIR}`),
  );

  await step("Enabling pnpm via corepack...", "Corepack enabled", async () => {
    await runQuiet("corepack enable", { cwd: APP_DIR });
    await runQuiet(`corepack prepare pnpm@${PNPM_VERSION} --activate`, { cwd: APP_DIR });
  });

  await step("Installing dependencies...", "Dependencies installed", () =>
    runQuiet("pnpm install --frozen-lockfile", { cwd: APP_DIR }),
  );

  await step("Building application...", "Application built", () =>
    runQuiet("pnpm build", { cwd: APP_DIR }),
  );

  writeFileSync(VERSION_FILE, VERSION, "utf-8");
  console.log("\nSetup complete!\n");
}

// Resolve (and create, if necessary) the data directory for local database/data.
function resolveDataDir(customPath) {
  // Use CLI-specified directory or fall back to default
  const dataDir = customPath || join(UBERSKILLS_HOME, "data");
  mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

// Resolve (and create, if necessary) a local encryption secret used for database encryption, etc.
function resolveEncryptionSecret(dataDir) {
  const secretPath = join(dataDir, ".secret");
  if (existsSync(secretPath)) {
    return readFileSync(secretPath, "utf-8").trim();
  }
  // Generate a new 32-byte hex secret and write it
  const secret = randomBytes(32).toString("hex");
  writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

// Print the fancy "running at" banner to stdout for the user, including URL and data file location.
function printBanner(port, host, dataDir) {
  const url = `http://${host}:${port}`;
  const dbPath = join(dataDir, "uberskills.db");

  console.log(`
┌─────────────────────────────────────────────────----------------┐
│                                                                 │
|   ▄▄ ▄▄ ▄▄▄▄  ▄▄▄▄▄ ▄▄▄▄  ▄█████ ██ ▄█▀ ██ ██     ██     ▄█████ |
|   ██ ██ ██▄██ ██▄▄  ██▄█▄ ▀▀▀▄▄▄ ████   ██ ██     ██     ▀▀▀▄▄▄ |
|   ▀███▀ ██▄█▀ ██▄▄▄ ██ ██ █████▀ ██ ▀█▄ ██ ██████ ██████ █████▀ |
|                                                                 │
|     made with \u2764\uFE0F  by Helder Vasconcelos               |
│                                                                 │
│   Local:  ${url.padEnd(53)}                                     |
│   Data:   ${dbPath.length > 53 ? `...${dbPath.slice(-50)}` : dbPath.padEnd(53)}│
│                                                                 │
│   Press Ctrl+C to stop                                          │
│                                                                 │
└──────────────────────────────────────────----------------───────┘
`);
}

// Launches the actual server as a child process after setup.
// Binds stdio, propagates SIGINT/SIGTERM, sets environment (including database location and encryption).
function startServer(port, host, dataDir, encryptionSecret, debug) {
  const standaloneDir = join(APP_DIR, "apps", "web", ".next", "standalone");
  const serverScript = join("apps", "web", "server.js");

  // Launch server using Node.js (executes Next.js app built for standlone production use)
  const child = spawn("node", [serverScript], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: `file:${join(dataDir, "uberskills.db")}`,
      ENCRYPTION_SECRET: encryptionSecret,
      PORT: String(port),
      HOSTNAME: host,
      ...(debug ? { LOG_LEVEL: "debug" } : {}),
    },
    stdio: "inherit",
  });

  // If there was a problem spawning the server process, exit loudly.
  child.on("error", (err) => {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });

  // When the child process closes, shut down the launcher too.
  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  // Gracefully handle Ctrl+C (SIGINT) and termination (SIGTERM)
  const shutdown = () => {
    child.kill("SIGTERM");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// ---
// MAIN EXECUTION BLOCK -- runs when this script is invoked from the CLI

const args = parseArgs(process.argv);

if (args.help) {
  printUsage();
  process.exit(0);
}

if (args.version) {
  console.log(`uberskills v${VERSION}`);
  process.exit(0);
}

checkPrerequisites(); // Ensure Node.js and git
await ensureInstalled(args.reset); // Download/build app if needed

const dataDir = resolveDataDir(args.dataDir); // Find or create data dir
const encryptionSecret = resolveEncryptionSecret(dataDir); // Find/create encryption secret

printBanner(args.port, args.host, dataDir); // User info banner
startServer(args.port, args.host, dataDir, encryptionSecret, args.debug); // Launch the server
