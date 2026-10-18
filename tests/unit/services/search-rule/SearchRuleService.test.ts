import { describe, expect, it, vi } from "vitest";
import { SearchRuleService } from "@/services/search-rule/SearchRuleService";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";

describe("SearchRuleService", () => {
  it("delegates getAll", async () => {
    const repository = { getAll: vi.fn().mockResolvedValue([]) };
    const service = new SearchRuleService(
      repository as unknown as SearchRuleRepository
    );

    await service.getAll();

    expect(repository.getAll).toHaveBeenCalled();
  });
});
