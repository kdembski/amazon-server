import { describe, expect, it, vi } from "vitest";
import { SelectableService } from "@/services/crud/SelectableService";

describe("SelectableService", () => {
  it("delegates to repository.getById", async () => {
    const getById = vi.fn().mockResolvedValue({ id: 5 });
    const service = new SelectableService({ getById });

    await expect(service.getById(5)).resolves.toEqual({ id: 5 });
    expect(getById).toHaveBeenCalledWith(5);
  });
});
