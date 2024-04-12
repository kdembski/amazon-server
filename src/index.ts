import express from "express";
import cors from "cors";
import cron from "node-cron";
import { OlxProductAvgPriceManager } from "@/managers/olx/OlxProductAvgPriceManager";
import { useWebSockets } from "@/websockets";
import { useRouter } from "@/routes";

const app = express();
app.use(express.json());
app.use(cors());

const { router } = useRouter();
app.use(router);

const server = app.listen(process.env.PORT || 5001, () =>
  console.log("OLX Server is running...")
);

useWebSockets(server);

cron.schedule("0 0 2 * * *", async () => {
  const avgPriceManager = new OlxProductAvgPriceManager();
  await avgPriceManager.calculateAllAvgPrices();
});

process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err}`);
});
