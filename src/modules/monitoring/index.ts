import { AppModule } from "@/shared/interfaces/AppModule";
import { ScraperStatusRouter } from "@/modules/monitoring/routes/ScraperStatusRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityEventCleanupCronService } from "@/modules/monitoring/cron/ActivityEventCleanupCronService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export function createMonitoringModule(
  sections: DailyReportSection[]
): AppModule {
  return {
    routers: [new ScraperStatusRouter()],
    crons: [
      new HourlyStatsCronService(),
      new DailyStatsCronService(sections),
      new ActivityEventCleanupCronService(),
    ],
  };
}
