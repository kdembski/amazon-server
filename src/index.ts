import { createApp } from "@/app";
import { useWebSockets } from "@/websockets";
import { CurrencyExchangeRateCronService } from "@/services/cron/CurrencyExchangeRateCronService";
import { HourlyStatsCronService } from "@/services/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/services/cron/DailyStatsCronService";
import { LogCleanupCronService } from "@/services/cron/LogCleanupCronService";
import { SearchRuleMatchCronService } from "@/services/cron/SearchRuleMatchCronService";

const app = createApp();

const server = app.listen(process.env.PORT || 5001, () =>
  console.log("Amazon Server is running...")
);

useWebSockets(server);

new CurrencyExchangeRateCronService().schedule();
new HourlyStatsCronService().schedule();
new DailyStatsCronService().schedule();
new LogCleanupCronService().schedule();
new SearchRuleMatchCronService().schedule();

process.on("uncaughtException", (err) => {
  console.error(err);
});

process.on("unhandledRejection", (reason) => {
  console.error(reason);
});
