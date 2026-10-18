import express from "express";
import cors from "cors";
import { createModules } from "@/modules";
import { AppModule } from "@/shared/interfaces/AppModule";

export function createApp(modules: AppModule[] = createModules()) {
  const app = express();
  app.use(express.json());
  app.use(cors());
  modules.forEach((module) =>
    module.routers?.forEach((router) =>
      app.use(router.path, router.build().router)
    )
  );
  return app;
}
