import express from "express";
import cors from "cors";
import { useRouter } from "@/routes";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use(useRouter().router);
  return app;
}
