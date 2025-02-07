import express from "express";
import cors from "cors";
import { useRouter } from "@/routes";
import { CurrencyExchangeRateCronService } from "@/services/cron/CurrencyExchangeRateCronService";
import { HourlyStatsCronService } from "@/services/cron/HourlyStatsCronService";
import { useWebSockets } from "@/websockets";

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

process.on("uncaughtException", (err) => {
  console.error(err);
});
