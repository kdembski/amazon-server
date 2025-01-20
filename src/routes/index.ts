import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { Router } from "express";

export function useRouter() {
  const subRouters = [new AmazonAdCategoryRouter(), new AmazonAdRouter()];
  const router = Router();

  subRouters.forEach((subRouter) => {
    router.use(subRouter.path, subRouter.build().router);
  });

  return { router };
}
