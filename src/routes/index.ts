import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { Router } from "express";
import { AmazonAdPriceRouter } from "./amazon/AmazonAdPriceRouter";
import { CountryRouter } from "./currency/CountryRouter";
import { CurrencyRouter } from "./currency/CurrencyRouter";
import { CurrencyExchangeRateRouter } from "./currency/CurrencyExchangeRateRouter";
import { ScrapersStatusRouter } from "@/routes/ScrapersStatusRouter";
import { SystemRouter } from "@/routes/SystemRouter";

export function useRouter() {
  const subRouters = [
    new AmazonAdCategoryRouter(),
    new AmazonAdRouter(),
    new AmazonAdPriceRouter(),
    new CountryRouter(),
    new CurrencyRouter(),
    new CurrencyExchangeRateRouter(),
    new ScrapersStatusRouter(),
    new SystemRouter(),
  ];
  const router = Router();

  subRouters.forEach((subRouter) => {
    router.use(subRouter.path, subRouter.build().router);
  });

  return { router };
}
