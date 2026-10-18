import { AppModule } from "@/shared/interfaces/AppModule";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityEventCleanupCronService } from "@/modules/monitoring/cron/ActivityEventCleanupCronService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export function createMonitoringModule(
  sections: DailyReportSection[]
): AppModule {
  return {
    routers: [new ScraperRouter()],
    crons: [
      new HourlyStatsCronService(),
      new DailyStatsCronService(sections),
      new ActivityEventCleanupCronService(),
    ],
  };
}
