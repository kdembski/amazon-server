import { describe, expect, it, vi } from "vitest";
import { AmazonSearchRuleService } from "@/modules/marketplaces/amazon/services/AmazonSearchRuleService";
import { AmazonSearchRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";

const setup = () => {
  const repository = {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new AmazonSearchRuleService(
    repository as unknown as AmazonSearchRuleRepository
  );
  return { service, repository };
};

describe("AmazonSearchRuleService", () => {
  it("delegates getAll", async () => {
    const { service, repository } = setup();

    await service.getAll();

    expect(repository.getAll).toHaveBeenCalled();
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();

    await service.creatable.create({ value: "sony", categoryId: 2 });
    await service.updatable.update(3, { categoryId: null });
    await service.deletable.delete(4);

    expect(repository.create).toHaveBeenCalledWith({
      value: "sony",
      categoryId: 2,
      createdAt: expect.any(Date),
    });
    expect(repository.update).toHaveBeenCalledWith(3, {
      value: undefined,
      categoryId: null,
    });
    expect(repository.delete).toHaveBeenCalledWith(4);
  });
});
