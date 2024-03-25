import { OlxAdRouter } from "@/routes/olx/OlxAdRouter";
import { OlxProductRouter } from "@/routes/olx/OlxProductRouter";
import { Router } from "express";

export function useRouter() {
  const subRouters = [new OlxAdRouter(), new OlxProductRouter()];
  const router = Router();

  subRouters.forEach((subRouter) => {
    router.use(subRouter.path, subRouter.build().router);
  });

  return { router };
}
