import { SearchRuleRepository } from "@/modules/search-rules/repositories/SearchRuleRepository";

export type SearchRuleSelectDto = NonNullable<
  Awaited<ReturnType<SearchRuleRepository["getById"]>>
>;
