import { BlacklistedKeywordRepository } from "@/repositories/blacklist/BlacklistedKeywordRepository";

export interface BlacklistedKeywordCreateDto {
  value: string;
}

export type BlacklistedKeywordSelectDto = NonNullable<
  Awaited<ReturnType<BlacklistedKeywordRepository["getById"]>>
>;
