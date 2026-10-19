import { AmazonSearchRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";

export type AmazonSearchRuleSelectDto = Awaited<
  ReturnType<AmazonSearchRuleRepository["getById"]>
>;
