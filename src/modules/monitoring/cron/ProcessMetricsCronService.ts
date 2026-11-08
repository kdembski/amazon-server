import { ProcessMetricsService } from "@/shared/system/ProcessMetricsService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronService } from "@/shared/system/CronService";

export class ProcessMetricsCronService extends CronService {
  // Second 45 keeps the log away from the activity flush at second 30
  protected readonly cronTime = "45 * * * * *";
  private role;
  private metricsService;

  constructor(
    role: "api" | "worker",
    metricsService = new ProcessMetricsService(),
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.role = role;
    this.metricsService = metricsService;
  }

  schedule() {
    this.metricsService.start();
    super.schedule();
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
