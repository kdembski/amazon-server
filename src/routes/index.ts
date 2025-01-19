import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { AmazonProductRouter } from "@/routes/amazon/AmazonProductRouter";
import { Router } from "express";

export function useRouter() {
  const subRouters = [
    new AmazonAdCategoryRouter(),
    new AmazonAdRouter(),
    new AmazonProductRouter(),
  ];
  const router = Router();

  subRouters.forEach((subRouter) => {
    router.use(subRouter.path, subRouter.build().router);
  });

  return { router };
}
