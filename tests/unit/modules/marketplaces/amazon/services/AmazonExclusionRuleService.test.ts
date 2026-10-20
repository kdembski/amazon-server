import { describe, expect, it, vi } from "vitest";
import { AmazonExclusionRuleService } from "@/modules/marketplaces/amazon/services/AmazonExclusionRuleService";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";

const setup = () => {
  const repository = {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    applyBatch: vi.fn().mockResolvedValue([]),
  };
  const service = new AmazonExclusionRuleService(
    repository as unknown as AmazonExclusionRuleRepository
  );
  return { service, repository };
};

describe("AmazonExclusionRuleService", () => {
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

describe("AmazonExclusionRuleService.applyBatch", () => {
  it("applies the mapped batch and returns all rules", async () => {
    const { service, repository } = setup();
    repository.getAll.mockResolvedValue([{ id: 1 }]);

    const result = await service.applyBatch({ delete: [4] });

    expect(repository.applyBatch).toHaveBeenCalledWith({
      create: [],
      update: [],
      delete: [4],
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it("rejects an invalid batch before writing", async () => {
    const { service, repository } = setup();

    await expect(service.applyBatch({ delete: [0] })).rejects.toMatchObject({
      status: 400,
    });
    expect(repository.applyBatch).not.toHaveBeenCalled();
  });
});
