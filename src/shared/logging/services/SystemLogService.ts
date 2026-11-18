import { SystemLogContext } from "@/shared/logging/dtos/SystemLogDtos";
import { SystemLogCreateMapper } from "@/shared/logging/mappers/SystemLogCreateMapper";
import { SystemLogRepository } from "@/shared/logging/repositories/SystemLogRepository";
import { SystemLogLevel } from "@prisma/client";

export class SystemLogService {
  private static instance: SystemLogService;
  private repository;
  private mapper;

  constructor(
    repository = new SystemLogRepository(),
    mapper = new SystemLogCreateMapper()
  ) {
    this.repository = repository;
    this.mapper = mapper;
  }

  public static getInstance(): SystemLogService {
    if (!SystemLogService.instance) {
      SystemLogService.instance = new SystemLogService();
    }

    return SystemLogService.instance;
  }

  error(source: string, message: string, context?: SystemLogContext) {
    return this.log("error", source, message, context);
  }

  warn(source: string, message: string, context?: SystemLogContext) {
    return this.log("warn", source, message, context);
  }

  info(source: string, message: string, context?: SystemLogContext) {
    return this.log("info", source, message, context);
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }

  // Never throws or rejects: callers log from catch blocks and error handlers.
  // Resolves once the log is stored, so a process can wait for it before exiting.
  private log(
    level: SystemLogLevel,
    source: string,
    message: string,
    context?: SystemLogContext
  ): Promise<void> {
    try {
      const data = this.mapper.toCreateInput({ level, source, message, context });
      const write = level === "info" ? console.log : console[level];
      write(`[${level}] ${data.source}: ${data.message}`, ...(data.context ? [data.context] : []));

      return this.repository.create(data).then(
        () => undefined,
        (e) => console.error(`[error] SystemLogService: failed to store log: ${e}`)
      );
    } catch (e) {
      console.error(`[error] SystemLogService: failed to log ${source}: ${message}: ${e}`);
      return Promise.resolve();
    }
  }
}
