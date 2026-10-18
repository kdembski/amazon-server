import { createApp } from "@/app";
import { createModules } from "@/modules";

const modules = createModules();
const app = createApp(modules);

app.listen(process.env.PORT || 5001, () =>
  console.log("Amazon Server is running...")
);

modules.forEach((module) => module.crons?.forEach((cron) => cron.schedule()));

process.on("uncaughtException", (err) => {
  console.error(err);
});

process.on("unhandledRejection", (reason) => {
  console.error(reason);
});
