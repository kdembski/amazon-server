import express from "express";
import cors from "cors";
import { useRouter } from "@/routes";
import { useWebSockets } from "@/websockets";
import { CurrencyExchangeRateCronService } from "@/services/cron/CurrencyExchangeRateCronService";
import { HourlyStatsCronService } from "@/services/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/services/cron/DailyStatsCronService";
import { DiscordCommandService } from "@/services/discord/DiscordCommandService";

const app = express();
app.use(express.json());
app.use(cors());

const { router } = useRouter();
app.use(router);

const server = app.listen(process.env.PORT || 5001, () =>
  console.log("Amazon Server is running...")
);

useWebSockets(server);

new CurrencyExchangeRateCronService().schedule();
new HourlyStatsCronService().schedule();
new DailyStatsCronService().schedule();

//DiscordCommandService.getInstance().login();

process.on("uncaughtException", (err) => {
  console.error(err);
});
