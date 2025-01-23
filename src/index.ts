import express from "express";
import cors from "cors";
import cron from "node-cron";
import { useRouter } from "@/routes";
import { LogService } from "@/services/LogService";
import { DiscordService } from "@/services/DiscordService";

const app = express();
app.use(express.json());
app.use(cors());

const { router } = useRouter();
app.use(router);

app.listen(process.env.PORT || 5001, () =>
  console.log("Amazon Server is running...")
);

process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err}`);
});

cron.schedule("00 00 */1 * * * *", async () => {
  const logService = new LogService();
  const discordService = new DiscordService();
  const now = new Date();

  const oneHoursBefore = new Date();
  oneHoursBefore.setHours(oneHoursBefore.getHours() - 1);

  const scrapedLogs = await logService.getByEvent(
    "ad_scraped",
    oneHoursBefore,
    now
  );
  const sentLogs = await logService.getByEvent("ad_sent", oneHoursBefore, now);

  discordService.send(
    `Scraped: ${scrapedLogs.length}/h | Sent: ${sentLogs.length}/h`
  );
});
