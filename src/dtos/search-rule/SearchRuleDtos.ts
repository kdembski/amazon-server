import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";

export type SearchRuleSelectDto = NonNullable<
  Awaited<ReturnType<SearchRuleRepository["getById"]>>
>;
