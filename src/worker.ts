import { createModules } from "@/modules";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const logger = SystemLogService.getInstance();

createModules().forEach((module) => module.workerCrons?.forEach((cron) => cron.schedule()));

logger.info("Worker", "Amazon Worker is running", {
  pid: process.pid,
  nodeVersion: process.version,
});

process.on("uncaughtException", (error) => {
  logger.error("Process", `Uncaught exception: ${error}`, { error });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Process", `Unhandled rejection: ${reason}`, { error: reason });
});
