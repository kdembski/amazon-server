import { AppModule } from "@/shared/interfaces/AppModule";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { StatsRouter } from "@/modules/monitoring/routes/StatsRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityCountFlushCronService } from "@/modules/monitoring/cron/ActivityCountFlushCronService";
import { ScraperMetricRollupCronService } from "@/modules/monitoring/cron/ScraperMetricRollupCronService";
import { ProcessMetricsCronService } from "@/modules/monitoring/cron/ProcessMetricsCronService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { RetentionCleanupCronService } from "@/shared/system/RetentionCleanupCronService";

export function createMonitoringModule(
  sections: DailyReportSection[]
): AppModule {
  return {
    routers: [new ScraperRouter(), new StatsRouter()],
    // the activity counts live in the memory of the api process
    crons: [new ActivityCountFlushCronService(), new ProcessMetricsCronService("api")],
    workerCrons: [
      new HourlyStatsCronService(),
      new DailyStatsCronService(sections),
      new RetentionCleanupCronService("00 30 03 * * *", "activity events", 30, new BusinessLogService()),
      new RetentionCleanupCronService("00 45 03 * * *", "scraper metrics", 30, new ScraperMetricService()),
      new ScraperMetricRollupCronService(),
      new RetentionCleanupCronService("00 15 04 * * *", "system logs", 30, SystemLogService.getInstance()),
      new ProcessMetricsCronService("worker"),
    ],
  };
}
