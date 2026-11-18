import { createApp } from "@/app";
import { createModules } from "@/modules";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const logger = SystemLogService.getInstance();
const modules = createModules();
const app = createApp(modules);
const port = process.env.PORT || 5001;

const server = app.listen(port, () =>
  logger.info("Server", "Amazon Server is running", {
    port,
    pid: process.pid,
    nodeVersion: process.version,
  })
);
server.keepAliveTimeout = 15 * 1000;
server.on("error", async (error) => {
  await logger.error("Server", `Server failed: ${error}`, { error, port });
  process.exit(1);
});

modules.forEach((module) => module.crons?.forEach((cron) => cron.schedule()));

process.on("uncaughtException", (error) => {
  logger.error("Process", `Uncaught exception: ${error}`, { error });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Process", `Unhandled rejection: ${reason}`, { error: reason });
});

(["SIGTERM", "SIGINT"] as const).forEach((signal) => {
  process.once(signal, async () => {
    await logger.info("Process", `Received ${signal}, shutting down`, {
      signal,
      uptimeS: Math.round(process.uptime()),
    });
    process.exit(0);
  });
});
