import { OlxAdRouter } from "@/routes/olx/OlxAdRouter";
import { Router } from "express";

export function useRouter() {
  const subRouters = [new OlxAdRouter()];
  const router = Router();

  subRouters.forEach((subRouter) => {
    router.use(subRouter.path, subRouter.build().router);
  });

  return { router };
}
