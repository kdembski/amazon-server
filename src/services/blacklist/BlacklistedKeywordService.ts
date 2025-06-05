import { BlacklistedKeywordSelectDto } from "@/dtos/blacklist/BlacklistedKeywordDtos";
import { BlacklistedKeywordCreateMapper } from "@/mappers/blacklist/BlacklistedKeywordCreateMapper";
import { BlacklistedKeywordRepository } from "@/repositories/blacklist/BlacklistedKeywordRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";

export class BlacklistedKeywordService {
  private repository;
  deletable;
  creatable;

  constructor(
    repository = new BlacklistedKeywordRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new BlacklistedKeywordCreateMapper()
    )
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  splitPlusKeywords(keywords: BlacklistedKeywordSelectDto[]) {
    return keywords.map((keyword) => {
      return {
        ...keyword,
        value: keyword.value.split("+"),
      };
    });
  }

  getByValue(value: string) {
    return this.repository.getByValue(value);
  }
}
