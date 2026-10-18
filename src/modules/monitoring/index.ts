import { AppModule } from "@/shared/interfaces/AppModule";
import { ScraperStatusRouter } from "@/modules/monitoring/routes/ScraperStatusRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { LogCleanupCronService } from "@/modules/monitoring/cron/LogCleanupCronService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export function createMonitoringModule(
  sections: DailyReportSection[]
): AppModule {
  return {
    routers: [new ScraperStatusRouter()],
    crons: [
      new HourlyStatsCronService(),
      new DailyStatsCronService(sections),
      new LogCleanupCronService(),
    ],
  };
}
