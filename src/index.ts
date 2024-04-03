import express from "express";
import cors from "cors";
import { useRouter } from "@/routes";
import cron from "node-cron";
import { OlxProductAvgPriceManager } from "@/managers/olx/OlxProductAvgPriceManager";

const app = express();
app.use(express.json());
app.use(cors());

const { router } = useRouter();
app.use(router);

process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err.message}`);
});

app.listen(process.env.PORT || 5001, () =>
  console.log("OLX Server is running...")
);

const avgPriceManager = new OlxProductAvgPriceManager();

cron.schedule("0 0 2 * * *", async () => {
  await avgPriceManager.calculateAllAvgPrices();
});
