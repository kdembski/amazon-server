import { describe, expect, it, vi } from "vitest";
import { UpdatableService } from "@/services/crud/UpdatableService";

describe("UpdatableService", () => {
  it("maps dto and delegates to repository.update with id", async () => {
    const update = vi.fn().mockResolvedValue({ id: 7, name: "z" });
    const mapper = {
      toUpdateInput: (dto: { name: string }) => ({
        name: dto.name,
        updatedAt: "now",
      }),
    };
    const service = new UpdatableService({ update }, mapper);

    const result = await service.update(7, { name: "z" });

    expect(update).toHaveBeenCalledWith(7, { name: "z", updatedAt: "now" });
    expect(result).toEqual({ id: 7, name: "z" });
  });
});
