import { ProcessMetricsService } from "@/shared/system/ProcessMetricsService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class ProcessMetricsCronService {
  private role;
  private metricsService;
  private logger;

  constructor(
    role: "api" | "worker",
    metricsService = new ProcessMetricsService(),
    logger = SystemLogService.getInstance()
  ) {
    this.role = role;
    this.metricsService = metricsService;
    this.logger = logger;
  }

  // Second 45 keeps the log away from the activity flush at second 30
  schedule() {
    this.metricsService.start();
    new CronJob("45 * * * * *", () =>
      this.run().catch((error) =>
        this.logger.error("ProcessMetricsCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const { cpuPercent, eventLoopDelayMs, heapUsedMb, rssMb } =
      this.metricsService.getSnapshot();
    this.logger.info(
      "ProcessMetricsCronService",
      `${this.role}: CPU ${cpuPercent}%, event loop p99 ${eventLoopDelayMs.p99} ms, max ${eventLoopDelayMs.max} ms, heap ${heapUsedMb} MB`,
      { role: this.role, pid: process.pid, cpuPercent, eventLoopDelayMs, heapUsedMb, rssMb }
    );
  }
}
