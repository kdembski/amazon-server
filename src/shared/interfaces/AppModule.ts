import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";

export interface AppModule {
  routers?: SubRouterI[];
  crons?: { schedule(): void }[];
}
