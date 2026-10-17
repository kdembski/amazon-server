import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";

export interface SearchRuleCreateDto {
  value: string;
}

export type SearchRuleSelectDto = NonNullable<
  Awaited<ReturnType<SearchRuleRepository["getById"]>>
>;
