import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";

export interface AppModule {
  routers?: SubRouterI[];
  // crons scheduled by the api process (src/index.ts)
  crons?: { schedule(): void }[];
  // crons scheduled by the worker process (src/worker.ts)
  workerCrons?: { schedule(): void }[];
}
