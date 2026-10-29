import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import { createModules } from "@/modules";
import { AppModule } from "@/shared/interfaces/AppModule";
import { RequestLogMiddleware } from "@/shared/http/RequestLogMiddleware";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { ApiTokenMiddleware } from "@/shared/http/ApiTokenMiddleware";

const SCRAPER_ROUTES = [
  { method: "POST", path: /^\/amazon\/ads\/?$/ },
  { method: "POST", path: /^\/amazon\/ads\/batch\/?$/ },
  { method: "PUT", path: /^\/amazon\/ads\/\d+\/?$/ },
  { method: "DELETE", path: /^\/amazon\/ads\/\d+\/?$/ },
  { method: "POST", path: /^\/scrapers\/[^/]+\/metrics\/?$/ },
];

export const handleError: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) return next(error);
  new ResponseErrorService(response).send(error);
};

export function createApp(modules: AppModule[] = createModules()) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  app.use(cors());
  app.use(new RequestLogMiddleware(SCRAPER_ROUTES).handle);
  app.use(new ApiTokenMiddleware().handle);
  modules.forEach((module) =>
    module.routers?.forEach((router) =>
      app.use(router.path, router.build().router)
    )
  );
  app.use(handleError);
  return app;
}
