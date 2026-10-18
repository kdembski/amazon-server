import { describe, expect, it, vi } from "vitest";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { deferred } from "../../../../support/fakes";

type Dto = { name: string };
type Input = { name: string; createdAt: string };
type Model = { id: number; name: string };

const mapper = {
  toCreateInput: (dto: Dto): Input => ({ name: dto.name, createdAt: "now" }),
};

describe("CreatableService", () => {
  it("maps dto and delegates to repository.create", async () => {
    const create = vi.fn().mockResolvedValue({ id: 1, name: "a" });
    const service = new CreatableService<Dto, Input, Model>({ create }, mapper);

    const result = await service.create({ name: "a" });

    expect(create).toHaveBeenCalledWith({ name: "a", createdAt: "now" });
    expect(result).toEqual({ id: 1, name: "a" });
  });

  it("createMany creates sequentially and returns models in order", async () => {
    const first = deferred<Model>();
    const create = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ id: 2, name: "b" });
    const service = new CreatableService<Dto, Input, Model>({ create }, mapper);

    const pending = service.createMany([{ name: "a" }, { name: "b" }]);
    await Promise.resolve();
    expect(create).toHaveBeenCalledTimes(1);

    first.resolve({ id: 1, name: "a" });
    const result = await pending;

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(2, { name: "b", createdAt: "now" });
    expect(result).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ]);
  });

  it("createMany skips duplicates and keeps creating the rest", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({ id: 2, name: "b" });
    const service = new CreatableService<Dto, Input, Model>({ create }, mapper);

    const result = await service.createMany([{ name: "a" }, { name: "b" }]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: 2, name: "b" }]);
  });

  it("createMany stops on errors other than a duplicate", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ code: "P1001" })
      .mockResolvedValueOnce({ id: 2, name: "b" });
    const service = new CreatableService<Dto, Input, Model>({ create }, mapper);

    await expect(
      service.createMany([{ name: "a" }, { name: "b" }])
    ).rejects.toEqual({ code: "P1001" });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
