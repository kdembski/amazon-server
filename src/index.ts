import { createApp } from "@/app";
import { createModules } from "@/modules";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const logger = SystemLogService.getInstance();
const modules = createModules();
const app = createApp(modules);
const port = process.env.PORT || 5001;

app.listen(port, () =>
  logger.info("Server", "Amazon Server is running", {
    port,
    pid: process.pid,
    nodeVersion: process.version,
  })
);

modules.forEach((module) => module.crons?.forEach((cron) => cron.schedule()));

process.on("uncaughtException", (error) => {
  logger.error("Process", `Uncaught exception: ${error}`, { error });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Process", `Unhandled rejection: ${reason}`, { error: reason });
});
