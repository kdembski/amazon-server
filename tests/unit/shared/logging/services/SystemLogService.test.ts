import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { SystemLogRepository } from "@/shared/logging/repositories/SystemLogRepository";
import { SystemLogCreateMapper } from "@/shared/logging/mappers/SystemLogCreateMapper";
import { resetSingleton } from "../../../../support/fakes";

const setup = () => {
  const create = vi.fn().mockResolvedValue({ id: 1 });
  const deleteOlderThan = vi.fn().mockResolvedValue(4);
  const repository = { create, deleteOlderThan } as unknown as SystemLogRepository;
  return { service: new SystemLogService(repository), create, deleteOlderThan };
};

describe("SystemLogService", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("is a singleton", () => {
    resetSingleton(SystemLogService);

    expect(SystemLogService.getInstance()).toBe(SystemLogService.getInstance());
  });

  it.each([
    ["error", () => error],
    ["warn", () => warn],
    ["info", () => log],
  ] as const)("stores and prints %s logs", (level, consoleFn) => {
    const { service, create } = setup();

    service[level]("DiscordService", "send failed", { attempt: 1 });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        level,
        source: "DiscordService",
        message: "send failed",
        context: { attempt: 1 },
      })
    );
    expect(consoleFn()).toHaveBeenCalledWith(`[${level}] DiscordService: send failed`, {
      attempt: 1,
    });
  });

  it("prints only the line without context", () => {
    const { service } = setup();

    service.info("http", "POST /x");

    expect(log).toHaveBeenCalledWith("[info] http: POST /x");
  });

  it("prints the redacted context", () => {
    const { service } = setup();

    service.error("http", "boom", { token: "abc" });

    expect(error).toHaveBeenCalledWith("[error] http: boom", { token: "[redacted]" });
  });

  it("falls back to the console when the db write rejects", async () => {
    const { service, create } = setup();
    create.mockRejectedValue(new Error("Can't reach database server"));

    service.error("ResponseErrorService", "boom");

    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        "[error] SystemLogService: failed to store log: Error: Can't reach database server"
      )
    );
  });

  it("never throws", () => {
    const create = vi.fn();
    const mapper = {
      toCreateInput: () => {
        throw new Error("bad");
      },
    } as unknown as SystemLogCreateMapper;
    const service = new SystemLogService({ create } as unknown as SystemLogRepository, mapper);

    expect(() => service.warn("x", "y")).not.toThrow();

    expect(create).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("[error] SystemLogService: failed to log x: y: Error: bad");
  });

  it("deletes old logs through the repository", async () => {
    const { service, deleteOlderThan } = setup();
    const date = new Date(1);

    expect(await service.deleteOlderThan(date)).toBe(4);
    expect(deleteOlderThan).toHaveBeenCalledWith(date);
  });
});
