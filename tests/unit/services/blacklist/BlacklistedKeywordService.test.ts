import { describe, expect, it, vi } from "vitest";
import { BlacklistedKeywordService } from "@/services/blacklist/BlacklistedKeywordService";
import { BlacklistedKeywordRepository } from "@/repositories/blacklist/BlacklistedKeywordRepository";
import { buildKeyword } from "../../../support/factories";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getByValue: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new BlacklistedKeywordService(
    repository as unknown as BlacklistedKeywordRepository
  );
  return { service, repository };
};

describe("BlacklistedKeywordService", () => {
  it("delegates getAll and getByValue", async () => {
    const { service, repository } = setup();
    await service.getAll();
    await service.getByValue("used");
    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getByValue).toHaveBeenCalledWith("used");
  });

  it("splitPlusKeywords splits values on '+'", () => {
    const { service } = setup();
    const result = service.splitPlusKeywords([
      buildKeyword({ value: "a+b" }),
      buildKeyword({ value: "c" }),
    ]);
    expect(result.map((k) => k.value)).toEqual([["a", "b"], ["c"]]);
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
