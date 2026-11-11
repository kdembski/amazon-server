import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { mkdtemp, readdir, readFile, rm, statfs as nodeStatfs, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { spawn as nodeSpawn } from "node:child_process";
import { DatabaseBackupCronService } from "@/shared/system/DatabaseBackupCronService";
import { unitLogger } from "../../../support/fakes";

const URL = "mysql://amazon:p%40ss@db:3307/amazon?connection_limit=30";
const FILE = "amazon-2026-11-11T01-00-00.000Z.sql.gz";

type FakeProcess = EventEmitter & { stdout: PassThrough; stderr: PassThrough; kill: ReturnType<typeof vi.fn> };

function fakeProcess() {
  return Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(),
  }) as FakeProcess;
}

function finish(proc: FakeProcess, code: number | null, stdout = "", stderr = "", signal: string | null = null) {
  proc.stdout.end(stdout);
  proc.stderr.end(stderr);
  setImmediate(() => proc.emit("close", code, signal));
}

function statfsWithFree(bytes: number) {
  return vi.fn().mockResolvedValue({ bavail: bytes / 4096, bsize: 4096 });
}

function spawnFinishing(code: number, stdout = "", stderr = "") {
  return vi.fn(() => {
    const proc = fakeProcess();
    setImmediate(() => finish(proc, code, stdout, stderr));
    return proc;
  });
}

function service(
  directory: string,
  spawn: unknown,
  databaseUrl: string | undefined = URL,
  keepCount = 7,
  statfs: unknown = statfsWithFree(1024 ** 4)
) {
  return new DatabaseBackupCronService(
    "00 00 01 * * *",
    directory,
    keepCount,
    databaseUrl,
    spawn as typeof nodeSpawn,
    statfs as typeof nodeStatfs
  );
}

describe("DatabaseBackupCronService", () => {
  let dir: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T01:00:00.000Z"));
    dir = await mkdtemp(join(tmpdir(), "backup-"));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps the cron time", () => {
    expect(service(dir, vi.fn())["cronTime"]).toBe("00 00 01 * * *");
  });

  it("dumps the database gzipped into the directory", async () => {
    const spawn = spawnFinishing(0, "CREATE TABLE x;");

    await service(dir, spawn).run();

    expect(gunzipSync(await readFile(join(dir, FILE))).toString()).toBe("CREATE TABLE x;");
    const [command, args, options] = spawn.mock.calls[0] as unknown as [string, string[], { env: NodeJS.ProcessEnv }];
    expect(command).toBe("nice");
    expect(args).toEqual([
      "-n", "19", "ionice", "-c3", "mysqldump", "--single-transaction", "--quick", "--no-tablespaces",
      "--default-character-set=utf8mb4", "-h", "db", "-P", "3307", "-u", "amazon", "amazon",
    ]);
    expect(options.env.MYSQL_PWD).toBe("p@ss");
    expect(args.some((arg) => arg.includes("p@ss") || arg.includes("p%40ss"))).toBe(false);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "DatabaseBackupCronService",
      expect.stringContaining(FILE),
      expect.objectContaining({ file: FILE, bytes: expect.any(Number), durationMs: expect.any(Number), deleted: 0 })
    );
  });

  it("uses the default port", async () => {
    const spawn = spawnFinishing(0);

    await service(dir, spawn, "mysql://amazon:x@db/amazon").run();

    const args = (spawn.mock.calls[0] as unknown as [string, string[]])[1];
    expect(args.slice(args.indexOf("-P"), args.indexOf("-P") + 2)).toEqual(["-P", "3306"]);
  });

  it("creates a missing directory", async () => {
    const nested = join(dir, "nested");

    await service(nested, spawnFinishing(0)).run();

    expect(await readdir(nested)).toEqual([FILE]);
  });

  it("fails with the stderr tail and removes the partial file", async () => {
    const old = "amazon-2026-11-10T01-00-00.000Z.sql.gz";
    await writeFile(join(dir, old), "old");
    const backup = service(dir, spawnFinishing(2, "partial", "x".repeat(5000) + "Access denied"));

    const error = await backup.run().catch((e: Error) => e);

    const prefix = "mysqldump exited with code 2: ";
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message.startsWith(prefix)).toBe(true);
    expect((error as Error).message.endsWith("Access denied")).toBe(true);
    expect((error as Error).message.length).toBeLessThanOrEqual(prefix.length + 2048);
    expect(await readdir(dir)).toEqual([old]);
    expect(backup["getFailureContext"]()).toEqual({ file: FILE });
  });

  it("fails when mysqldump cannot start", async () => {
    const spawn = vi.fn(() => {
      const proc = fakeProcess();
      setImmediate(() => {
        proc.emit("error", new Error("spawn nice ENOENT"));
        proc.stdout.end();
      });
      return proc;
    });

    await expect(service(dir, spawn).run()).rejects.toThrow("spawn nice ENOENT");
    expect(await readdir(dir)).toEqual([]);
  });

  it("fails without DATABASE_URL", async () => {
    const spawn = vi.fn();

    await expect(service(dir, spawn, "").run()).rejects.toThrow("DATABASE_URL is not set");
    expect(spawn).not.toHaveBeenCalled();
  });

  it("keeps the newest copies", async () => {
    for (let day = 1; day <= 8; day++) {
      await writeFile(join(dir, `amazon-2026-11-0${day}T01-00-00.000Z.sql.gz`), "old");
    }
    await writeFile(join(dir, "amazon-2026-11-09T01-00-00.000Z.sql.gz.part"), "partial");
    await writeFile(join(dir, "notes.txt"), "keep");

    await service(dir, spawnFinishing(0)).run();

    expect((await readdir(dir)).sort()).toEqual([
      ...[3, 4, 5, 6, 7, 8].map((day) => `amazon-2026-11-0${day}T01-00-00.000Z.sql.gz`),
      FILE,
      "notes.txt",
    ]);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "DatabaseBackupCronService",
      expect.any(String),
      expect.objectContaining({ deleted: 2 })
    );
  });

  it("fails without dumping when the free space is below twice the newest backup", async () => {
    await writeFile(join(dir, "amazon-2026-11-09T01-00-00.000Z.sql.gz"), "x".repeat(100));
    await writeFile(join(dir, "amazon-2026-11-10T01-00-00.000Z.sql.gz"), "x".repeat(4096));
    const spawn = vi.fn();
    const statfs = statfsWithFree(4096);

    await expect(service(dir, spawn, URL, 7, statfs).run()).rejects.toThrow(
      `Not enough free space in ${dir}: 4096 bytes free, 8192 needed`
    );
    expect(statfs).toHaveBeenCalledWith(dir);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("dumps when the free space is at least twice the newest backup", async () => {
    await writeFile(join(dir, "amazon-2026-11-10T01-00-00.000Z.sql.gz"), "x".repeat(4096));
    const spawn = spawnFinishing(0);

    await service(dir, spawn, URL, 7, statfsWithFree(8192)).run();

    expect(spawn).toHaveBeenCalled();
  });

  it("kills a dump that runs longer than 6 hours", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const proc = fakeProcess();
    proc.kill.mockImplementation(() => finish(proc, null, "", "", "SIGTERM"));
    const spawn = vi.fn(() => proc);

    const run = service(dir, spawn).run().catch((e: Error) => e);
    while (!spawn.mock.calls.length) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    vi.advanceTimersByTime(6 * 60 * 60 * 1000 - 1);
    expect(proc.kill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(proc.kill).toHaveBeenCalledTimes(1);
    expect(((await run) as Error).message).toBe("mysqldump was killed by SIGTERM: ");
  });

  it("skips a run while the previous one is running", async () => {
    const proc = fakeProcess();
    const spawn = vi.fn(() => proc);
    const backup = service(dir, spawn);

    const first = backup.run();
    await vi.waitFor(() => expect(spawn).toHaveBeenCalled());
    await backup.run();

    expect(unitLogger().warn).toHaveBeenCalledWith("DatabaseBackupCronService", "Previous backup is still running");
    expect(spawn).toHaveBeenCalledTimes(1);
    finish(proc, 0);
    await first;
  });
});
