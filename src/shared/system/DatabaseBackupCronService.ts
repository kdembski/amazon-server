import * as child_process from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, statfs as fsStatfs } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { CronService } from "@/shared/system/CronService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const STDERR_TAIL = 2048;
const TIMEOUT_MS = 6 * 60 * 60 * 1000;
const BACKUP_FILE = /^amazon-.*\.sql\.gz$/;
const PARTIAL_FILE = /^amazon-.*\.sql\.gz\.part$/;

// Writes a gzipped mysqldump of the database to `directory` and keeps the newest `keepCount` dumps
export class DatabaseBackupCronService extends CronService {
  protected readonly cronTime;
  private directory;
  private keepCount;
  private databaseUrl;
  private spawn;
  private statfs;
  private running = false;
  private file?: string;

  constructor(
    cronTime: string,
    directory: string,
    keepCount: number,
    databaseUrl = process.env.DATABASE_URL,
    spawn: typeof child_process.spawn = child_process.spawn,
    statfs = fsStatfs,
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.cronTime = cronTime;
    this.directory = directory;
    this.keepCount = keepCount;
    this.databaseUrl = databaseUrl;
    this.spawn = spawn;
    this.statfs = statfs;
  }

  protected getFailureContext() {
    return { file: this.file };
  }

  async run() {
    if (this.running) {
      this.logger.warn("DatabaseBackupCronService", "Previous backup is still running");
      return;
    }

    this.running = true;
    try {
      await this.backup();
    } finally {
      this.running = false;
    }
  }

  private async backup() {
    if (!this.databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }
    const url = new URL(this.databaseUrl);
    const startedAt = Date.now();
    const file = `amazon-${new Date().toISOString().replaceAll(":", "-")}.sql.gz`;
    const path = join(this.directory, file);
    const partPath = `${path}.part`;
    this.file = file;

    await mkdir(this.directory, { recursive: true });
    await this.removeFiles((name) => PARTIAL_FILE.test(name));
    await this.ensureFreeSpace();

    try {
      const stderr = await this.dump(url, partPath);
      await rename(partPath, path);

      const { size } = await stat(path);
      const deleted = await this.removeOldBackups();
      this.logger.info("DatabaseBackupCronService", `Backed up the database to ${file}`, {
        file,
        bytes: size,
        durationMs: Date.now() - startedAt,
        deleted,
        ...(stderr && { stderr }),
      });
    } finally {
      await rm(partPath, { force: true });
    }
  }

  // The backups share the disk with MySQL, so a dump must not fill it.
  // shortcut: twice the newest backup as the estimate, skipped before the first backup
  private async ensureFreeSpace() {
    const newest = (await readdir(this.directory)).filter((name) => BACKUP_FILE.test(name)).sort().at(-1);
    if (!newest) {
      return;
    }

    const needed = (await stat(join(this.directory, newest))).size * 2;
    const { bavail, bsize } = await this.statfs(this.directory);
    const free = bavail * bsize;
    if (free < needed) {
      throw new Error(`Not enough free space in ${this.directory}: ${free} bytes free, ${needed} needed`);
    }
  }

  // Resolves with the stderr tail of a successful mysqldump
  private async dump(url: URL, partPath: string) {
    const proc = this.spawn(
      "nice",
      [
        "-n", "19", "ionice", "-c3", "mysqldump", "--single-transaction", "--quick", "--no-tablespaces",
        "--default-character-set=utf8mb4", "-h", url.hostname, "-P", url.port || "3306", "-u", decodeURIComponent(url.username), url.pathname.slice(1),
      ],
      { env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) } }
    );

    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL);
    });

    const exit = new Promise<[number | null, NodeJS.Signals | null]>((resolve, reject) => {
      proc.on("close", (code, signal) => resolve([code, signal]));
      proc.on("error", reject);
    });
    const timeout = setTimeout(() => proc.kill(), TIMEOUT_MS);
    try {
      const [[code, signal]] = await Promise.all([
        exit,
        pipeline(proc.stdout, createGzip(), createWriteStream(partPath)),
      ]);

      if (signal) {
        throw new Error(`mysqldump was killed by ${signal}: ${stderr}`);
      }
      if (code !== 0) {
        throw new Error(`mysqldump exited with code ${code}: ${stderr}`);
      }
      return stderr;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async removeOldBackups() {
    const backups = (await readdir(this.directory)).filter((name) => BACKUP_FILE.test(name)).sort();
    const old = backups.slice(0, Math.max(0, backups.length - this.keepCount));
    await this.removeFiles((name) => old.includes(name));
    return old.length;
  }

  private async removeFiles(matches: (name: string) => boolean) {
    const names = (await readdir(this.directory)).filter(matches);
    await Promise.all(names.map((name) => rm(join(this.directory, name), { force: true })));
  }
}
