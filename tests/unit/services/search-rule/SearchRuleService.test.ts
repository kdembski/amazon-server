import { describe, expect, it, vi } from "vitest";
import { SearchRuleService } from "@/services/search-rule/SearchRuleService";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getByValue: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new SearchRuleService(
    repository as unknown as SearchRuleRepository
  );
  return { service, repository };
};

describe("SearchRuleService", () => {
  it("delegates getAll and getByValue", async () => {
    const { service, repository } = setup();
    await service.getAll();
    await service.getByValue("used");
    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getByValue).toHaveBeenCalledWith("used");
  });

  it("wires creatable and deletable to the repository", async () => {
    const { service, repository } = setup();
    await service.creatable.create({ value: "used" });
    await service.deletable.delete(3);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ value: "used", createdAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(3);
  });
});
