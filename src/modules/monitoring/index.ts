import { AppModule } from "@/shared/interfaces/AppModule";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { StatsRouter } from "@/modules/monitoring/routes/StatsRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityCountFlushCronService } from "@/modules/monitoring/cron/ActivityCountFlushCronService";
import { ActivityEventCleanupCronService } from "@/modules/monitoring/cron/ActivityEventCleanupCronService";
import { ScraperMetricCleanupCronService } from "@/modules/monitoring/cron/ScraperMetricCleanupCronService";
import { SystemLogCleanupCronService } from "@/modules/monitoring/cron/SystemLogCleanupCronService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export function createMonitoringModule(
  sections: DailyReportSection[]
): AppModule {
  return {
    routers: [new ScraperRouter(), new StatsRouter()],
    crons: [
      new HourlyStatsCronService(),
      new DailyStatsCronService(sections),
      new ActivityCountFlushCronService(),
      new ActivityEventCleanupCronService(),
      new ScraperMetricCleanupCronService(),
      new SystemLogCleanupCronService(),
    ],
  };
}
