import { describe, expect, it, vi } from "vitest";
import { SearchRuleService } from "@/modules/search-rules/services/SearchRuleService";
import { SearchRuleRepository } from "@/modules/search-rules/repositories/SearchRuleRepository";

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
